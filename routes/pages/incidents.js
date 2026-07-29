const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireLogin, requireRole } = require('../../middleware/auth');

// @route   GET /incidents/report
// @desc    Render standard detailed incident reporting form
// @access  Reporter, Admin
router.get('/report', requireLogin, requireRole(['reporter', 'admin']), (req, res) => {
  return res.render('report_incident', {
    title: 'CampusAlert - File Report',
    user: req.session.user
  });
});

// @route   GET /incidents/:id
// @desc    Render details of a specific incident, status log audit trail, location, and update forms
// @access  Private (Reporter-owner, Responders assigned to unit, Admin)
router.get('/:id', requireLogin, async (req, res) => {
  const incidentId = req.params.id;
  const { id: userId, role, response_unit_type } = req.session.user;
  const fastFollow = req.query.fast_follow === 'true';

  try {
    // 1. Fetch incident detail
    const [incidents] = await db.execute(
      `SELECT i.*, u.name as reporter_name, u.email as reporter_email 
       FROM incidents i 
       JOIN users u ON i.reporter_id = u.id 
       WHERE i.id = ?`,
      [incidentId]
    );

    if (incidents.length === 0) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested incident record was not found.',
        user: req.session.user
      });
    }

    const incident = incidents[0];

    // 2. Access control check
    if (role === 'reporter') {
      if (incident.reporter_id !== userId) {
        return res.status(403).render('error', {
          title: 'Access Denied',
          message: 'You are not authorized to view this incident report.',
          user: req.session.user
        });
      }
    } else if (role === 'response_unit') {
      // Responders can only see incidents that map to their unit
      let allowedCategories = [];
      if (response_unit_type === 'security') {
        allowedCategories = ['security', 'other'];
      } else if (response_unit_type === 'medical') {
        allowedCategories = ['medical', 'accident'];
      } else if (response_unit_type === 'fire') {
        allowedCategories = ['fire'];
      }

      if (!allowedCategories.includes(incident.category)) {
        return res.status(403).render('error', {
          title: 'Access Denied',
          message: 'This incident is not routed to your response unit.',
          user: req.session.user
        });
      }
    }

    // 3. Fetch status history trail (Audit trail)
    const [statusLogs] = await db.execute(
      `SELECT l.*, u.name as updater_name, u.role as updater_role, u.response_unit_type 
       FROM incident_status_log l 
       JOIN users u ON l.updated_by_user_id = u.id 
       WHERE l.incident_id = ? 
       ORDER BY l.updated_at ASC`,
      [incidentId]
    );

    // 4. If responder views the incident, mark associated notifications as read
    if (role === 'response_unit') {
      await db.execute(
        `UPDATE notifications SET read_at = NOW() 
         WHERE incident_id = ? AND target_user_id = ? AND read_at IS NULL`,
        [incidentId, userId]
      );
    }

    return res.render('incident_details', {
      title: `CampusAlert - Incident #${incident.id}`,
      user: req.session.user,
      incident,
      statusLogs,
      fastFollow
    });
  } catch (error) {
    console.error('Incident Details Route Error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      message: 'Failed to retrieve incident details.',
      user: req.session.user
    });
  }
});

module.exports = router;
