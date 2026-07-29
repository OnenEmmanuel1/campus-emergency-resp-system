const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireApiLogin, requireApiRole } = require('../../middleware/auth');
const { processNewIncident, transitionIncidentStatus } = require('../../engine/cersEngine');

// @route   POST /api/incidents/report
// @desc    Submit standard detailed emergency report
// @access  Authenticated (Reporter, Admin)
router.post('/report', requireApiLogin, async (req, res) => {
  const { category, description, latitude, longitude, severity } = req.body;
  const reporterId = req.session.user.id;

  if (!category) {
    return res.status(400).json({ success: false, error: 'Category is required.' });
  }

  try {
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    const result = await processNewIncident({
      reporterId,
      category,
      description,
      latitude: lat,
      longitude: lng,
      severity: severity || null // engine handles auto-classification if null
    });

    req.session.flashSuccess = 'Emergency incident report filed successfully!';
    return res.json({ 
      success: true, 
      message: 'Emergency report submitted successfully.', 
      incidentId: result.incidentId,
      redirect: `/incidents/${result.incidentId}`
    });
  } catch (error) {
    console.error('Report Incident API Error:', error);
    return res.status(500).json({ success: false, error: 'Server error. Failed to file report.' });
  }
});

// @route   POST /api/incidents/one-click
// @desc    Fast-create a minimal emergency record (with coords) without waiting for form details
// @access  Authenticated (Reporter, Admin)
router.post('/one-click', requireApiLogin, async (req, res) => {
  const { latitude, longitude } = req.body;
  const reporterId = req.session.user.id;

  try {
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    // A one-click alert initiates a high-severity 'other' category alert
    // which routes to Security and classifies automatically as critical/high based on current state.
    const result = await processNewIncident({
      reporterId,
      category: 'other',
      description: 'One-click Instant Emergency Alert triggered.',
      latitude: lat,
      longitude: lng,
      severity: 'critical' // One-click is critical by default
    });

    req.session.flashSuccess = 'Emergency alert triggered and dispatched successfully!';
    return res.json({
      success: true,
      message: 'Instant emergency alert broadcasted!',
      incidentId: result.incidentId,
      redirect: `/incidents/${result.incidentId}?fast_follow=true`
    });
  } catch (error) {
    console.error('One-Click Alert API Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to broadcast instant alert.' });
  }
});

// @route   POST /api/incidents/:id/update-details
// @desc    Fast-follow details update for a submitted incident (useful for one-click reports)
// @access  Authenticated (Reporter must be the owner, or Admin)
router.post('/:id/update-details', requireApiLogin, async (req, res) => {
  const incidentId = req.params.id;
  const { category, description, severity } = req.body;
  const userId = req.session.user.id;
  const userRole = req.session.user.role;

  try {
    // Check ownership
    const [incidents] = await db.execute('SELECT reporter_id, status FROM incidents WHERE id = ?', [incidentId]);
    if (incidents.length === 0) {
      return res.status(404).json({ success: false, error: 'Incident not found.' });
    }

    const incident = incidents[0];
    if (userRole !== 'admin' && incident.reporter_id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this incident.' });
    }

    // Prepare dynamic query updates
    let updateFields = [];
    let queryParams = [];

    if (category) {
      updateFields.push('category = ?');
      queryParams.push(category);
    }
    if (description) {
      updateFields.push('description = ?');
      queryParams.push(description);
    }
    if (severity) {
      updateFields.push('severity = ?');
      queryParams.push(severity);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update.' });
    }

    queryParams.push(incidentId);
    await db.execute(
      `UPDATE incidents SET ${updateFields.join(', ')} WHERE id = ?`,
      queryParams
    );

    // If category was updated, we should update routed unit (reroute notifications)
    if (category) {
      const { routeIncidentCategory } = require('../../engine/cersEngine');
      const targetUnitType = routeIncidentCategory(category);
      
      // Update notifications for this incident: delete old ones that are unread/unacknowledged
      // and insert new ones.
      await db.execute('DELETE FROM notifications WHERE incident_id = ? AND read_at IS NULL', [incidentId]);
      
      // Get responders of the new category unit type
      const [responders] = await db.execute(
        `SELECT id FROM users WHERE role = 'response_unit' AND response_unit_type = ?`,
        [targetUnitType]
      );
      
      const notificationPromises = responders.map(responder => {
        return db.execute(
          `INSERT INTO notifications (incident_id, target_user_id) VALUES (?, ?)`,
          [incidentId, responder.id]
        );
      });
      await Promise.all(notificationPromises);
    }

    return res.json({ success: true, message: 'Details updated successfully.' });
  } catch (error) {
    console.error('Update Incident Details Error:', error);
    return res.status(500).json({ success: false, error: 'Server error. Failed to update incident.' });
  }
});

// @route   PUT /api/incidents/:id/status
// @desc    Update status of an incident (dispatched, resolved, etc.)
// @access  Authenticated (Response Unit, Admin)
router.put('/:id/status', requireApiLogin, requireApiRole(['response_unit', 'admin']), async (req, res) => {
  const incidentId = req.params.id;
  const { status } = req.body;
  const userId = req.session.user.id;

  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required.' });
  }

  try {
    await transitionIncidentStatus(incidentId, status, userId);
    req.session.flashSuccess = `Incident status successfully updated to: ${status.toUpperCase()}`;
    return res.json({ success: true, message: `Status updated to ${status}.` });
  } catch (error) {
    console.error('Update Incident Status API Error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to update status.' });
  }
});

module.exports = router;
