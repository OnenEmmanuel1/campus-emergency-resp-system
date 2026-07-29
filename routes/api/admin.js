const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { requireApiLogin, requireApiRole } = require('../../middleware/auth');

// Apply Admin restriction to all routes in this file
router.use(requireApiLogin, requireApiRole(['admin']));

// @route   GET /api/admin/export-csv
// @desc    Export all incidents as CSV
// @access  Admin
router.get('/export-csv', async (req, res) => {
  try {
    const [incidents] = await db.execute(
      `SELECT i.id, u.name as reporter_name, u.email as reporter_email, 
              i.category, i.description, i.latitude, i.longitude, 
              i.severity, i.status, i.created_at
       FROM incidents i
       JOIN users u ON i.reporter_id = u.id
       ORDER BY i.created_at DESC`
    );

    // Build CSV content
    const headers = [
      'Incident ID', 
      'Reporter Name', 
      'Reporter Email', 
      'Category', 
      'Description', 
      'Latitude', 
      'Longitude', 
      'Severity', 
      'Status', 
      'Created At'
    ];

    let csvContent = headers.join(',') + '\r\n';

    incidents.forEach(inc => {
      // Escape field values to avoid CSV breaking
      const row = [
        inc.id,
        `"${(inc.reporter_name || '').replace(/"/g, '""')}"`,
        `"${(inc.reporter_email || '').replace(/"/g, '""')}"`,
        inc.category,
        `"${(inc.description || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
        inc.latitude || '',
        inc.longitude || '',
        inc.severity,
        inc.status,
        inc.created_at ? new Date(inc.created_at).toISOString() : ''
      ];
      csvContent += row.join(',') + '\r\n';
    });

    // Set Response Headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="campusalert_incidents_report.csv"');
    
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate CSV export.' });
  }
});

module.exports = router;
