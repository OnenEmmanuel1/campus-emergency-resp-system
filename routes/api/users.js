const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../config/db');
const { requireApiLogin, requireApiRole } = require('../../middleware/auth');

// Apply Admin restriction to all routes in this file
router.use(requireApiLogin, requireApiRole(['admin']));

// @route   GET /api/users
// @desc    Get all users list
// @access  Admin
router.get('/', async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, name, email, role, response_unit_type, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ success: true, users });
  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

// @route   POST /api/users
// @desc    Create a new user (admin provisioned)
// @access  Admin
router.post('/', async (req, res) => {
  const { name, email, password, role, response_unit_type } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, error: 'Please supply all required fields.' });
  }

  // Validate roles and categories
  if (!['admin', 'response_unit', 'reporter'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid user role.' });
  }

  if (role === 'response_unit' && !['security', 'medical', 'fire'].includes(response_unit_type)) {
    return res.status(400).json({ success: false, error: 'Response unit users must have a unit type assignment.' });
  }

  try {
    // Check duplication
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'User email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save
    const unitType = role === 'response_unit' ? response_unit_type : null;
    const [result] = await db.execute(
      `INSERT INTO users (name, email, password_hash, role, response_unit_type) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, passwordHash, role, unitType]
    );

    return res.json({ 
      success: true, 
      user: { id: result.insertId, name, email, role, response_unit_type: unitType } 
    });
  } catch (error) {
    console.error('Create User Error:', error);
    return res.status(500).json({ success: false, error: 'Server error creating user.' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update an existing user configuration
// @access  Admin
router.put('/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, email, role, response_unit_type, password } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ success: false, error: 'Name, email, and role are required.' });
  }

  try {
    const unitType = role === 'response_unit' ? response_unit_type : null;
    let query = `UPDATE users SET name = ?, email = ?, role = ?, response_unit_type = ?`;
    let params = [name, email, role, unitType];

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      query += `, password_hash = ?`;
      params.push(passwordHash);
    }

    query += ` WHERE id = ?`;
    params.push(userId);

    const [result] = await db.execute(query, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    console.error('Update User Error:', error);
    return res.status(500).json({ success: false, error: 'Database write error.' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user account
// @access  Admin
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;

  // Prevent self deletion
  if (parseInt(userId, 10) === req.session.user.id) {
    return res.status(400).json({ success: false, error: 'You cannot delete your own admin account.' });
  }

  try {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({ success: false, error: 'Database write error.' });
  }
});

module.exports = router;
