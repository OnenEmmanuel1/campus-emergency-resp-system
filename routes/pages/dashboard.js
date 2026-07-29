const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireLogin } = require('../../middleware/auth');
const { generateSystemAnalytics } = require('../../engine/cersEngine');

// @route   GET /dashboard
// @desc    Render user dashboard based on role
// @access  Private
router.get('/dashboard', requireLogin, async (req, res) => {
  const { id, role, response_unit_type } = req.session.user;

  try {
    if (role === 'reporter') {
      // Fetch incidents reported by this user
      const [incidents] = await db.execute(
        `SELECT * FROM incidents WHERE reporter_id = ? ORDER BY created_at DESC`,
        [id]
      );
      return res.render('dashboard_reporter', {
        title: 'CampusAlert - Reporter Dashboard',
        user: req.session.user,
        incidents
      });
      
    } else if (role === 'response_unit') {
      // Determine mapped categories for current responder type
      let categories = [];
      if (response_unit_type === 'security') {
        categories = ['security', 'other'];
      } else if (response_unit_type === 'medical') {
        categories = ['medical', 'accident'];
      } else if (response_unit_type === 'fire') {
        categories = ['fire'];
      }

      // Safeguard in case of unassigned unit type
      if (categories.length === 0) {
        categories = ['other'];
      }

      // Query active and resolved incidents assigned to this responder's category mapping
      const [incidents] = await db.query(
        `SELECT i.*, u.name as reporter_name 
         FROM incidents i 
         JOIN users u ON i.reporter_id = u.id 
         WHERE i.category IN (?) 
         ORDER BY 
           CASE 
             WHEN i.status = 'reported' THEN 1
             WHEN i.status = 'acknowledged' THEN 2
             WHEN i.status = 'dispatched' THEN 3
             WHEN i.status = 'in_progress' THEN 4
             ELSE 5 
           END ASC, 
           i.created_at DESC`,
        [categories]
      );

      // Get count of unread notifications for this user
      const [notifResult] = await db.execute(
        `SELECT COUNT(*) as unread_count FROM notifications WHERE target_user_id = ? AND read_at IS NULL`,
        [id]
      );
      const unreadNotificationsCount = notifResult[0].unread_count || 0;

      return res.render('dashboard_responder', {
        title: 'CampusAlert - Responder Dashboard',
        user: req.session.user,
        incidents,
        unreadCount: unreadNotificationsCount
      });

    } else if (role === 'admin') {
      // System wide analytics metrics
      const analytics = await generateSystemAnalytics();

      // Recent incidents list
      const [incidents] = await db.execute(
        `SELECT i.*, u.name as reporter_name 
         FROM incidents i 
         JOIN users u ON i.reporter_id = u.id 
         ORDER BY i.created_at DESC LIMIT 15`
      );

      // Users management list
      const [users] = await db.execute(
        `SELECT id, name, email, role, response_unit_type, created_at FROM users ORDER BY created_at DESC`
      );

      return res.render('dashboard_admin', {
        title: 'CampusAlert - Admin Dashboard',
        user: req.session.user,
        analytics,
        incidents,
        users
      });
    }

    // Role mismatch fall through
    return res.status(403).send('Invalid user role.');
  } catch (error) {
    console.error('Dashboard Route Error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      message: 'Failed to build user dashboard dashboard.',
      user: req.session.user
    });
  }
});

module.exports = router;
