const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireApiLogin } = require('../../middleware/auth');

// @route   GET /api/notifications
// @desc    Get current notifications for the logged-in user (usually responders)
// @access  Authenticated
router.get('/', requireApiLogin, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [notifications] = await db.execute(
      `SELECT n.id, n.incident_id, n.dispatched_at, n.read_at, i.category, i.severity, i.status
       FROM notifications n
       JOIN incidents i ON n.incident_id = i.id
       WHERE n.target_user_id = ?
       ORDER BY n.dispatched_at DESC`,
      [userId]
    );

    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    return res.status(500).json({ success: false, error: 'Database fetch error.' });
  }
});

// @route   PUT /api/notifications/read
// @desc    Mark all user's notifications as read
// @access  Authenticated
router.put('/read', requireApiLogin, async (req, res) => {
  const userId = req.session.user.id;

  try {
    await db.execute(
      'UPDATE notifications SET read_at = NOW() WHERE target_user_id = ? AND read_at IS NULL',
      [userId]
    );
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark Notifications Read Error:', error);
    return res.status(500).json({ success: false, error: 'Database write error.' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a specific notification as read
// @access  Authenticated
router.put('/:id/read', requireApiLogin, async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.session.user.id;

  try {
    const [result] = await db.execute(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND target_user_id = ? AND read_at IS NULL',
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found or already read.' });
    }

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark Single Notification Read Error:', error);
    return res.status(500).json({ success: false, error: 'Database write error.' });
  }
});

module.exports = router;
