const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../config/db');

// @route   POST /api/auth/register
// @desc    Register a new reporter (student/staff)
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Please enter all required fields.' });
  }

  try {
    // Check if user already exists
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'An account with that email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user (default role is 'reporter')
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'reporter']
    );

    // Log the user in
    req.session.user = {
      id: result.insertId,
      name,
      email,
      role: 'reporter',
      response_unit_type: null
    };

    req.session.flashSuccess = 'Registration successful! Welcome to CampusAlert.';
    return res.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    console.error('Registration API Error:', error);
    return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and set session
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Please enter all required fields.' });
  }

  try {
    // Find user by email
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid credentials.' });
    }

    const user = users[0];

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid credentials.' });
    }

    // Set session user details
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      response_unit_type: user.response_unit_type
    };

    req.session.flashSuccess = `Welcome back, ${user.name}!`;
    return res.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    console.error('Login API Error:', error);
    return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  }
});

// @route   POST /api/auth/logout
// @desc    Log user out / destroy session
// @access  Authenticated
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, error: 'Failed to log out.' });
    }
    res.clearCookie('sid');
    return res.json({ success: true, redirect: '/login?logout=true' });
  });
});

module.exports = router;
