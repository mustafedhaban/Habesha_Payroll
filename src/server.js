'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const { sendError, readJSONBody } = require('./http-utils');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');
const teamRoutes = require('./routes/team');
const rateScheduleRoutes = require('./routes/rateSchedule');
const activityRoutes = require('./routes/activity');
const companyRoutes = require('./routes/company');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'web', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent path traversal outside the build directory
  const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, safePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // SPA fallback — client routes like /dashboard have no matching file
      if (path.extname(safePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found');
      }
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      return fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end(
            'Frontend not built. Run: npm run build:web\nThen restart the server.',
          );
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexData);
      });
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const { pathname } = parsed;
  const method = req.method;

  try {
    // ---- Auth ----
    if (pathname === '/api/auth/register' && method === 'POST') {
      return await authRoutes.register(req, res);
    }
    if (pathname === '/api/auth/login' && method === 'POST') {
      return await authRoutes.login(req, res);
    }
    if (pathname === '/api/auth/logout' && method === 'POST') {
      return authRoutes.logout(req, res);
    }
    if (pathname === '/api/auth/me' && method === 'GET') {
      return authRoutes.me(req, res);
    }
    if (pathname === '/api/auth/forgot-password' && method === 'POST') {
      return await authRoutes.forgotPassword(req, res);
    }
    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      return await authRoutes.resetPassword(req, res);
    }
    if (pathname === '/api/auth/invite' && method === 'GET') {
      return authRoutes.getInvite(req, res, parsed.query.token || '');
    }
    if (pathname === '/api/auth/accept-invite' && method === 'POST') {
      return await authRoutes.acceptInvite(req, res);
    }

    // ---- Employees ----
    if (pathname === '/api/employees' && method === 'GET') {
      return employeeRoutes.list(req, res);
    }
    if (pathname === '/api/employees' && method === 'POST') {
      return await employeeRoutes.create(req, res);
    }
    if (pathname === '/api/employees/import' && method === 'POST') {
      return await employeeRoutes.importEmployees(req, res);
    }
    let m = pathname.match(/^\/api\/employees\/(\d+)$/);
    if (m && method === 'PUT') {
      return await employeeRoutes.update(req, res, Number(m[1]));
    }
    if (m && method === 'DELETE') {
      return employeeRoutes.remove(req, res, Number(m[1]));
    }

    // ---- Payroll runs ----
    if (pathname === '/api/payroll/preview' && method === 'POST') {
      let body;
      try {
        body = await readJSONBody(req);
      } catch (err) {
        return sendError(res, 400, err.message);
      }
      return await payrollRoutes.previewPayroll(req, res, body);
    }
    if (pathname === '/api/payroll/runs' && method === 'GET') {
      return payrollRoutes.listRuns(req, res);
    }
    if (pathname === '/api/payroll/runs' && method === 'POST') {
      let body;
      try {
        body = await readJSONBody(req);
      } catch (err) {
        return sendError(res, 400, err.message);
      }
      return await payrollRoutes.runPayroll(req, res, body);
    }
    m = pathname.match(/^\/api\/payroll\/runs\/(\d+)$/);
    if (m && method === 'GET') {
      return payrollRoutes.getRun(req, res, Number(m[1]));
    }
    if (m && method === 'DELETE') {
      return payrollRoutes.deleteRun(req, res, Number(m[1]));
    }
    m = pathname.match(/^\/api\/payroll\/runs\/(\d+)\/export\.csv$/);
    if (m && method === 'GET') {
      return payrollRoutes.exportRunCSV(req, res, Number(m[1]));
    }
    m = pathname.match(/^\/api\/payroll\/runs\/(\d+)\/payslips\.zip$/);
    if (m && method === 'GET') {
      return payrollRoutes.exportPayslipZip(req, res, Number(m[1]));
    }
    m = pathname.match(/^\/api\/payroll\/runs\/(\d+)\/payslip\/(\d+)\.pdf$/);
    if (m && method === 'GET') {
      return payrollRoutes.payslipPdf(req, res, Number(m[1]), Number(m[2]));
    }
    m = pathname.match(/^\/api\/payroll\/runs\/(\d+)\/payslip\/(\d+)$/);
    if (m && method === 'GET') {
      return payrollRoutes.payslipPreview(req, res, Number(m[1]), Number(m[2]));
    }

    // ---- Team (multi-user roles) ----
    if (pathname === '/api/team' && method === 'GET') {
      return teamRoutes.list(req, res);
    }
    if (pathname === '/api/team/invite' && method === 'POST') {
      return await teamRoutes.invite(req, res);
    }

    // ---- Rate-schedule verification ----
    if (pathname === '/api/rate-schedule' && method === 'GET') {
      return rateScheduleRoutes.get(req, res);
    }
    if (pathname === '/api/rate-schedule/verify' && method === 'POST') {
      return await rateScheduleRoutes.verify(req, res);
    }

    // ---- Company profile ----
    if (pathname === '/api/company' && method === 'GET') {
      return companyRoutes.getCompany(req, res);
    }
    if (pathname === '/api/company' && method === 'PUT') {
      return await companyRoutes.updateCompany(req, res);
    }

    // ---- Activity / audit log ----
    if (pathname === '/api/activity' && method === 'GET') {
      return activityRoutes.list(req, res);
    }

    // ---- User profile ----
    if (pathname === '/api/user/profile' && method === 'PUT') {
      return await profileRoutes.updateProfile(req, res);
    }
    if (pathname === '/api/user/change-password' && method === 'POST') {
      return await profileRoutes.changePassword(req, res);
    }

    // ---- Notifications ----
    if (pathname === '/api/notifications' && method === 'GET') {
      return notificationRoutes.list(req, res);
    }
    if (pathname === '/api/notifications/read-all' && method === 'POST') {
      return notificationRoutes.markAllRead(req, res);
    }
    m = pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
    if (m && method === 'POST') {
      return notificationRoutes.markRead(req, res, Number(m[1]));
    }

    // ---- Static frontend ----
    if (pathname.startsWith('/api/')) {
      return sendError(res, 404, 'Unknown API route.');
    }
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error('Unhandled error:', err);
    sendError(res, 500, 'Internal server error.');
  }
});

server.listen(PORT, () => {
  console.log(`Habesha Payroll MVP running at http://localhost:${PORT}`);
});
