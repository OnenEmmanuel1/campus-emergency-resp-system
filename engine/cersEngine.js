const db = require('../config/db');

// Configurable Category-to-Unit Mapping
const CATEGORY_TO_UNIT_MAP = {
  'fire': 'fire',
  'medical': 'medical',
  'security': 'security',
  'accident': 'medical',
  'other': 'security'
};

// Valid Incident Status list (in order)
const STATUS_ORDER = ['reported', 'acknowledged', 'dispatched', 'in_progress', 'resolved'];

/**
 * Automates incident severity classification based on description keywords and category defaults
 * @param {string} category 
 * @param {string} description 
 * @returns {string} severity ('low', 'medium', 'high', 'critical')
 */
function classifySeverity(category, description = '') {
  const descLower = description.toLowerCase();
  
  // High-risk keywords signaling critical emergency
  const criticalKeywords = ['collapse', 'unconscious', 'heart', 'stroke', 'weapon', 'shooter', 'bomb', 'hostage', 'choking', 'explosion', 'bleeding'];
  // High-severity keywords
  const highKeywords = ['fire', 'smoke', 'assault', 'fight', 'theft', 'break-in', 'accident', 'injury', 'broken bone'];

  if (criticalKeywords.some(keyword => descLower.includes(keyword))) {
    return 'critical';
  }
  
  if (highKeywords.some(keyword => descLower.includes(keyword))) {
    return 'high';
  }

  // Category defaults if description keywords aren't hit
  switch (category) {
    case 'fire':
      return 'high';
    case 'medical':
      return 'high';
    case 'security':
      return 'medium';
    case 'accident':
      return 'medium';
    case 'other':
    default:
      return 'low';
  }
}

/**
 * Maps an incident category to its appropriate response unit type
 * @param {string} category 
 * @returns {string} response_unit_type
 */
function routeIncidentCategory(category) {
  return CATEGORY_TO_UNIT_MAP[category] || 'security';
}

/**
 * Validates a status transition
 * @param {string} currentStatus 
 * @param {string} newStatus 
 * @returns {boolean}
 */
function isValidTransition(currentStatus, newStatus) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const newIndex = STATUS_ORDER.indexOf(newStatus);
  
  if (currentIndex === -1 || newIndex === -1) return false;
  
  // Responders can proceed sequentially, or they can skip intermediate steps (e.g. reported -> dispatched directly)
  // However, status should not go backwards in general.
  return newIndex >= currentIndex;
}

/**
 * Handles creation of an incident, severity classification, mapping/routing, and notification creation
 * @param {object} incidentData 
 * @returns {Promise<object>} Created incident details
 */
async function processNewIncident({ reporterId, category, description, latitude, longitude, severity }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Determine severity automatically if not supplied
    const finalSeverity = severity || classifySeverity(category, description);
    const initialStatus = 'reported';

    // 2. Insert incident
    const [incidentResult] = await connection.execute(
      `INSERT INTO incidents (reporter_id, category, description, latitude, longitude, severity, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reporterId, category, description || null, latitude || null, longitude || null, finalSeverity, initialStatus]
    );
    const incidentId = incidentResult.insertId;

    // 3. Log initial status change in status log (Audit trail)
    await connection.execute(
      `INSERT INTO incident_status_log (incident_id, status, updated_by_user_id) 
       VALUES (?, ?, ?)`,
      [incidentId, initialStatus, reporterId]
    );

    // 4. Route Incident: Determine target response unit type
    const targetUnitType = routeIncidentCategory(category);

    // 5. Query responders belonging to the target response unit type
    const [responders] = await connection.execute(
      `SELECT id FROM users WHERE role = 'response_unit' AND response_unit_type = ?`,
      [targetUnitType]
    );

    // 6. Generate Notification records for each matching responder
    const notificationPromises = responders.map(responder => {
      return connection.execute(
        `INSERT INTO notifications (incident_id, target_user_id) VALUES (?, ?)`,
        [incidentId, responder.id]
      );
    });
    await Promise.all(notificationPromises);

    await connection.commit();
    console.log(`Incident ID ${incidentId} created. Routed to unit: ${targetUnitType}. Dispatched ${responders.length} notifications.`);

    return {
      incidentId,
      category,
      severity: finalSeverity,
      status: initialStatus,
      routedUnit: targetUnitType,
      notifiedResponders: responders.length
    };
  } catch (error) {
    await connection.rollback();
    console.error('Error processing new incident in Engine:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Handles transitioning an incident's status and logs it in the audit trail
 * @param {number} incidentId 
 * @param {string} newStatus 
 * @param {number} userId 
 * @returns {Promise<boolean>}
 */
async function transitionIncidentStatus(incidentId, newStatus, userId) {
  // Validate status value
  if (!STATUS_ORDER.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch current status
    const [incidents] = await connection.execute(
      `SELECT status FROM incidents WHERE id = ? FOR UPDATE`,
      [incidentId]
    );

    if (incidents.length === 0) {
      throw new Error(`Incident with ID ${incidentId} not found.`);
    }

    const currentStatus = incidents[0].status;

    // Check transition validity
    if (!isValidTransition(currentStatus, newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}.`);
    }

    // Update status
    await connection.execute(
      `UPDATE incidents SET status = ? WHERE id = ?`,
      [newStatus, incidentId]
    );

    // Log the update
    await connection.execute(
      `INSERT INTO incident_status_log (incident_id, status, updated_by_user_id) 
       VALUES (?, ?, ?)`,
      [incidentId, newStatus, userId]
    );

    await connection.commit();
    console.log(`Incident ID ${incidentId} status transitioned to ${newStatus} by User ${userId}.`);
    return true;
  } catch (error) {
    await connection.rollback();
    console.error(`Error transitioning status for incident ${incidentId}:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Calculates analytics reports for the Admin dashboard
 * @returns {Promise<object>} Analytics data
 */
async function generateSystemAnalytics() {
  try {
    // 1. Average Response Time: reported -> resolved (in minutes)
    // We calculate this by finding the 'reported' status log and the 'resolved' status log for resolved incidents,
    // and taking the average difference.
    const responseTimeQuery = `
      SELECT AVG(TIMESTAMPDIFF(MINUTE, start_log.updated_at, end_log.updated_at)) as avg_response_time
      FROM incidents i
      JOIN incident_status_log start_log ON i.id = start_log.incident_id AND start_log.status = 'reported'
      JOIN incident_status_log end_log ON i.id = end_log.incident_id AND end_log.status = 'resolved'
      WHERE i.status = 'resolved';
    `;
    const [timeResult] = await db.execute(responseTimeQuery);
    const avgResponseTime = timeResult[0].avg_response_time || 0;

    // 2. Incident volume by category
    const categoryQuery = `
      SELECT category, COUNT(*) as count 
      FROM incidents 
      GROUP BY category;
    `;
    const [categoryResult] = await db.execute(categoryQuery);

    // 3. Incident volume by status
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM incidents 
      GROUP BY status;
    `;
    const [statusResult] = await db.execute(statusQuery);

    // 4. Severity counts
    const severityQuery = `
      SELECT severity, COUNT(*) as count
      FROM incidents
      GROUP BY severity;
    `;
    const [severityResult] = await db.execute(severityQuery);

    // 5. Monthly incident trends
    const trendsQuery = `
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count
      FROM incidents
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC;
    `;
    const [trendsResult] = await db.execute(trendsQuery);

    return {
      avgResponseTime: parseFloat(avgResponseTime).toFixed(1),
      byCategory: categoryResult,
      byStatus: statusResult,
      bySeverity: severityResult,
      trends: trendsResult
    };
  } catch (error) {
    console.error('Error generating system analytics:', error);
    throw error;
  }
}

module.exports = {
  routeIncidentCategory,
  classifySeverity,
  processNewIncident,
  transitionIncidentStatus,
  generateSystemAnalytics
};
