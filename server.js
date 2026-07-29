const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database connection checking
require('./config/db');

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup express session
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'campus_alert_super_secret_session_key_9876',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: false, // Set to true in production over HTTPS
    httpOnly: true
  }
}));

// Set EJS view engine and directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set static files directory
app.use(express.static(path.join(__dirname, 'public')));

// Global locals injection for views
app.use((req, res, next) => {
  res.locals.user = (req.session && req.session.user) ? req.session.user : null;
  res.locals.flashSuccess = (req.session && req.session.flashSuccess) ? req.session.flashSuccess : null;
  res.locals.flashError = (req.session && req.session.flashError) ? req.session.flashError : null;
  if (req.session) {
    delete req.session.flashSuccess;
    delete req.session.flashError;
  }
  next();
});

// Root URL Routing redirect
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/login');
});

// Page Routing Modules
app.use('/', require('./routes/pages/auth'));
app.use('/', require('./routes/pages/dashboard'));
app.use('/incidents', require('./routes/pages/incidents'));

// JSON API Routing Modules
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/incidents', require('./routes/api/incidents'));
app.use('/api/users', require('./routes/api/users'));
app.use('/api/notifications', require('./routes/api/notifications'));
app.use('/api/admin', require('./routes/api/admin'));

// Render error handler
app.get('/error', (req, res) => {
  res.render('error', {
    title: 'Error',
    message: 'An unexpected error occurred.',
    user: req.session ? req.session.user : null
  });
});

// Catch-all 404 Route
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: `The page '${req.originalUrl}' does not exist on this campus network.`,
    user: req.session ? req.session.user : null
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`CampusAlert server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
