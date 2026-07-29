/**
 * Authentication and Role Authorization Middleware
 */

function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login');
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    
    const userRole = req.session.user.role;
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    
    // Forbidden
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have the required permissions to view this page.',
      user: req.session.user
    });
  };
}

function requireApiLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Unauthorized: Session expired or invalid.' });
}

function requireApiRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    
    const userRole = req.session.user.role;
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    
    return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
  };
}

module.exports = {
  requireLogin,
  requireRole,
  requireApiLogin,
  requireApiRole
};
