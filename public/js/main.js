/**
 * CampusAlert - Client-Side App Interaction Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- AUTHENTICATION HANDLERS ---
  const loginForm = document.getElementById('cers-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const feedback = document.getElementById('auth-feedback');
      
      feedback.style.display = 'none';
      
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect;
        } else {
          feedback.textContent = data.error || 'Login failed.';
          feedback.className = 'cers-form-feedback cers-error';
        }
      } catch (err) {
        console.error(err);
        feedback.textContent = 'Server communication failed. Please try again.';
        feedback.className = 'cers-form-feedback cers-error';
      }
    });
  }

  const registerForm = document.getElementById('cers-register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const feedback = document.getElementById('auth-feedback');
      
      feedback.style.display = 'none';
      
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect;
        } else {
          feedback.textContent = data.error || 'Registration failed.';
          feedback.className = 'cers-form-feedback cers-error';
        }
      } catch (err) {
        console.error(err);
        feedback.textContent = 'Server communication failed. Please try again.';
        feedback.className = 'cers-form-feedback cers-error';
      }
    });
  }

  const logoutBtn = document.getElementById('cers-btn-logout');
  const logoutNavBtn = document.getElementById('cers-btn-logout-nav');
  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirect;
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  if (logoutNavBtn) {
    logoutNavBtn.addEventListener('click', handleLogout);
  }

  // --- ONE-CLICK EMERGENCY ALERT ---
  const triggerOneClickAlert = async (btnElement, statusElement) => {
    btnElement.disabled = true;
    btnElement.style.opacity = '0.6';
    if (statusElement) {
      statusElement.textContent = 'GATHERING GPS LOCATION...';
      statusElement.style.color = '';
    }

    try {
      const location = await getCampusGeolocation();
      if (statusElement) statusElement.textContent = 'BROADCASTING EMERGENCY ALERT...';

      const res = await fetch('/api/incidents/one-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude
        })
      });

      const data = await res.json();
      if (data.success) {
        if (statusElement) statusElement.textContent = 'ALERT SENT! REDIRECTING...';
        window.location.href = data.redirect;
      } else {
        throw new Error(data.error || 'Failed to dispatch alert.');
      }
    } catch (error) {
      console.error(error);
      if (statusElement) {
        statusElement.textContent = 'ERROR SENDING ALERT.';
        statusElement.style.color = '#ef4444';
      }
      btnElement.disabled = false;
      btnElement.style.opacity = '1';
    }
  };

  const oneClickAlertBtn = document.getElementById('cers-btn-one-click-trigger');
  const alertStatusEl = document.getElementById('cers-one-click-status');
  if (oneClickAlertBtn) {
    oneClickAlertBtn.addEventListener('click', () => triggerOneClickAlert(oneClickAlertBtn, alertStatusEl));
  }

  const sidebarEmergencyBtn = document.getElementById('cers-sidebar-emergency-trigger');
  const sidebarStatusEl = document.getElementById('cers-sidebar-emergency-status');
  if (sidebarEmergencyBtn) {
    sidebarEmergencyBtn.addEventListener('click', () => triggerOneClickAlert(sidebarEmergencyBtn, sidebarStatusEl));
  }

  const navbarEmergencyBtn = document.getElementById('cers-navbar-emergency-trigger');
  if (navbarEmergencyBtn) {
    navbarEmergencyBtn.addEventListener('click', () => triggerOneClickAlert(navbarEmergencyBtn, null));
  }

  // --- DETAILED REPORT SUBMISSION ---
  const detailedReportForm = document.getElementById('cers-report-form');
  if (detailedReportForm) {
    // Attempt auto-populate coords on form load
    getCampusGeolocation().then(location => {
      const latInput = document.getElementById('latitude');
      const lngInput = document.getElementById('longitude');
      if (latInput && lngInput) {
        latInput.value = location.latitude.toFixed(6);
        lngInput.value = location.longitude.toFixed(6);
      }
    });

    detailedReportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category = document.getElementById('category').value;
      const description = document.getElementById('description').value;
      const severity = document.getElementById('severity').value;
      const latitude = document.getElementById('latitude').value;
      const longitude = document.getElementById('longitude').value;
      const feedback = document.getElementById('report-feedback');
      
      feedback.style.display = 'none';

      try {
        const res = await fetch('/api/incidents/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, description, severity, latitude, longitude })
        });
        const data = await res.json();
        if (data.success) {
          window.location.href = data.redirect;
        } else {
          feedback.textContent = data.error || 'Failed to submit report.';
          feedback.className = 'cers-form-feedback cers-error';
        }
      } catch (err) {
        console.error(err);
        feedback.textContent = 'Failed to communicate with emergency services.';
        feedback.className = 'cers-form-feedback cers-error';
      }
    });
  }

  // --- FAST FOLLOW DETAILS UPDATE ---
  const fastFollowForm = document.getElementById('cers-fast-follow-form');
  if (fastFollowForm) {
    fastFollowForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const incidentId = fastFollowForm.dataset.incidentId;
      const category = document.getElementById('category').value;
      const description = document.getElementById('description').value;
      const severity = document.getElementById('severity').value;
      const feedback = document.getElementById('fast-follow-feedback');

      feedback.style.display = 'none';

      try {
        const res = await fetch(`/api/incidents/${incidentId}/update-details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, description, severity })
        });
        const data = await res.json();
        if (data.success) {
          // Reload page with clean URL
          window.location.href = `/incidents/${incidentId}`;
        } else {
          feedback.textContent = data.error || 'Failed to update details.';
          feedback.className = 'cers-form-feedback cers-error';
        }
      } catch (err) {
        console.error(err);
        feedback.textContent = 'Failed to submit details.';
        feedback.className = 'cers-form-feedback cers-error';
      }
    });
  }

  // --- RESPONDER STATUS TRANSITIONS ---
  const statusUpdateForm = document.getElementById('cers-status-update-form');
  if (statusUpdateForm) {
    statusUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const incidentId = statusUpdateForm.dataset.incidentId;
      const status = document.getElementById('status-select').value;
      const feedback = document.getElementById('status-feedback');

      feedback.style.display = 'none';

      try {
        const res = await fetch(`/api/incidents/${incidentId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          feedback.textContent = data.error || 'Failed to update status.';
          feedback.className = 'cers-form-feedback cers-error';
        }
      } catch (err) {
        console.error(err);
        feedback.textContent = 'Failed to execute status update request.';
        feedback.className = 'cers-form-feedback cers-error';
      }
    });
  }

  // --- ADMIN USER MANAGEMENT CRUD ---
  const userForm = document.getElementById('cers-user-form');
  if (userForm) {
    // Handle switching unit type field depending on role selection
    const roleSelect = document.getElementById('role');
    const unitTypeGroup = document.getElementById('unit-type-group');
    if (roleSelect && unitTypeGroup) {
      roleSelect.addEventListener('change', () => {
        if (roleSelect.value === 'response_unit') {
          unitTypeGroup.style.display = 'block';
        } else {
          unitTypeGroup.style.display = 'none';
        }
      });
    }

    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = userForm.dataset.userId; // exists if editing
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;
      const response_unit_type = document.getElementById('response_unit_type').value;
      const feedback = document.getElementById('user-feedback');

      feedback.style.display = 'none';
      const method = userId ? 'PUT' : 'POST';
      const url = userId ? `/api/users/${userId}` : '/api/users';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, response_unit_type })
        });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          feedback.textContent = data.error || 'Failed to save user account.';
          feedback.className = 'cers-form-feedback cers-error';
        }
      } catch (err) {
        console.error(err);
        feedback.textContent = 'Database transmission failed.';
        feedback.className = 'cers-form-feedback cers-error';
      }
    });
  }

  // Edit User details trigger
  const editButtons = document.querySelectorAll('.cers-btn-edit-user');
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const user = JSON.parse(btn.dataset.userJson);
      
      // Update form header and dataset
      const titleEl = document.getElementById('cers-user-form-title');
      if (titleEl) titleEl.textContent = `Edit User: ${user.name}`;
      userForm.dataset.userId = user.id;

      document.getElementById('name').value = user.name;
      document.getElementById('email').value = user.email;
      document.getElementById('role').value = user.role;
      
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.removeAttribute('required'); // Password not required on edit
        passwordInput.placeholder = 'Leave blank to keep unchanged';
      }

      const roleSelect = document.getElementById('role');
      const unitTypeGroup = document.getElementById('unit-type-group');
      if (user.role === 'response_unit') {
        unitTypeGroup.style.display = 'block';
        document.getElementById('response_unit_type').value = user.response_unit_type || '';
      } else {
        unitTypeGroup.style.display = 'none';
      }

      // Scroll to form
      userForm.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Delete User Account trigger
  const deleteButtons = document.querySelectorAll('.cers-btn-delete-user');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId;
      const userName = btn.dataset.userName;
      
      if (!confirm(`Are you sure you want to permanently delete user "${userName}"?`)) {
        return;
      }

      try {
        const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          alert(data.error || 'Failed to delete user.');
        }
      } catch (err) {
        console.error(err);
        alert('Server communication error.');
      }
    });
  });

  // --- RESPONDER ALERT POLLING FEED ---
  const notifCounter = document.getElementById('cers-notif-count');
  const notifFeedContainer = document.getElementById('cers-notification-feed-container');

  if (notifCounter || notifFeedContainer) {
    // Fetch notifications function
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        
        if (data.success && data.notifications) {
          const notifications = data.notifications;
          const unread = notifications.filter(n => n.read_at === null);

          // Update counter badge
          if (notifCounter) {
            if (unread.length > 0) {
              notifCounter.textContent = unread.length;
              notifCounter.style.display = 'inline-block';
            } else {
              notifCounter.style.display = 'none';
            }
          }

          // Update lists if rendering inside responders dash
          if (notifFeedContainer) {
            if (notifications.length === 0) {
              notifFeedContainer.innerHTML = '<div class="cers-text-muted text-center py-3">No notifications received.</div>';
              return;
            }

            let html = '';
            notifications.forEach(notif => {
              const dateStr = new Date(notif.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isUnread = notif.read_at === null;
              
              html += `
                <div class="cers-notification-item ${isUnread ? 'cers-unread' : ''}" data-notif-id="${notif.id}">
                  <div class="cers-notification-content">
                    <strong>Category: ${notif.category.toUpperCase()}</strong> (Severity: ${notif.severity.toUpperCase()})
                    <div style="font-size: 0.85rem; color: #374151;">Status: ${notif.status.toUpperCase()}</div>
                    <div class="cers-notification-time">Received at ${dateStr}</div>
                  </div>
                  <div>
                    <a href="/incidents/${notif.incident_id}" class="cers-btn cers-btn-secondary" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">Respond</a>
                  </div>
                </div>
              `;
            });
            notifFeedContainer.innerHTML = html;
          }
        }
      } catch (err) {
        console.error('Error fetching notifications feed:', err);
      }
    };

    // Run fetch once and poll every 6 seconds
    fetchNotifications();
    setInterval(fetchNotifications, 6000);
  }

  // --- HEADER NOTIFICATION BELL HANDLER ---
  const notifBell = document.getElementById('cers-nav-notification-btn');
  const notifDropdown = document.getElementById('cers-notification-dropdown');
  const notifBadge = document.getElementById('cers-notification-badge');
  const notifList = document.getElementById('cers-notification-list');
  const markAllReadBtn = document.getElementById('cers-mark-all-read');

  if (notifBell) {
    // Toggle dropdown
    notifBell.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = notifDropdown.style.display === 'block';
      notifDropdown.style.display = isVisible ? 'none' : 'block';
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBell) {
        notifDropdown.style.display = 'none';
      }
    });

    // Mark all as read
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          const res = await fetch('/api/notifications/read', { method: 'PUT' });
          const data = await res.json();
          if (data.success) {
            // Refresh
            updateBellNotifications();
            // Also refresh feed if it exists on dashboard page
            const refreshBtn = document.getElementById('cers-refresh-notif-btn');
            if (refreshBtn) refreshBtn.click();
          }
        } catch (err) {
          console.error('Failed to mark all as read:', err);
        }
      });
    }

    // Function to load and render bell notifications
    async function updateBellNotifications() {
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (data.success && data.notifications) {
          const notifications = data.notifications;
          const unreadCount = notifications.filter(n => n.read_at === null).length;

          // Update badge
          if (unreadCount > 0) {
            notifBadge.textContent = unreadCount;
            notifBadge.style.display = 'flex';
          } else {
            notifBadge.style.display = 'none';
          }

          // Update list
          if (notifications.length === 0) {
            notifList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--cers-text-muted);">No new notifications.</div>';
            return;
          }

          let html = '';
          notifications.forEach(notif => {
            const isUnread = notif.read_at === null;
            const dateStr = new Date(notif.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `
              <div class="d-flex align-items-center justify-content-between" style="padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--cers-border); ${isUnread ? 'background-color: #eff6ff;' : ''}">
                <div style="min-width: 0; flex: 1; padding-right: 0.5rem; text-align: left;">
                  <div style="font-weight: 700; font-size: 0.72rem; color: var(--cers-text-main);">
                    ${notif.category.toUpperCase()} ALERT (${notif.severity})
                  </div>
                  <div style="font-size: 0.65rem; color: var(--cers-text-muted); margin-top: 0.1rem;">
                    Status: ${notif.status.toUpperCase()} • ${dateStr}
                  </div>
                </div>
                <a href="/incidents/${notif.incident_id}" class="cers-btn cers-btn-primary" style="font-size: 0.65rem; padding: 0.2rem 0.4rem; text-transform: none; font-weight: 700; border-radius: 6px; flex-shrink: 0;">
                  Respond
                </a>
              </div>
            `;
          });
          notifList.innerHTML = html;
        }
      } catch (err) {
        console.error('Failed to load bell notifications:', err);
      }
    }

    // Run on load and poll every 7 seconds
    updateBellNotifications();
    setInterval(updateBellNotifications, 7000);
  }
});
