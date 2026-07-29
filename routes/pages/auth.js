const express = require('express');
const router = express.Router();

// GET /login
router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  if (req.query.logout === 'true') {
    res.locals.flashSuccess = 'You have logged out successfully.';
  }
  return res.render('login', { title: 'CampusAlert - Login', error: null });
});

// GET /register
router.get('/register', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.render('register', { title: 'CampusAlert - Register', error: null });
});

module.exports = router;
