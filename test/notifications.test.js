'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const notifications = require('../src/notifications');

test('notifyCompany inserts one notification per user', () => {
  db.exec('BEGIN');
  try {
    const companyId = Number(
      db.prepare('INSERT INTO companies (name) VALUES (?)').run('Notify Test Co').lastInsertRowid,
    );
    const auth = require('../src/auth');
    const { hash, salt } = auth.hashPassword('testpass12');
    const userA = Number(
      db.prepare(
        'INSERT INTO users (company_id, email, password_hash, password_salt, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(companyId, 'notify-a@test.local', hash, salt, 'User A', 'admin').lastInsertRowid,
    );
    const userB = Number(
      db.prepare(
        'INSERT INTO users (company_id, email, password_hash, password_salt, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(companyId, 'notify-b@test.local', hash, salt, 'User B', 'viewer').lastInsertRowid,
    );

    notifications.notifyCompany(
      companyId,
      {
        kind: 'payroll.completed',
        title: 'Test payroll',
        body: 'Demo body',
        linkPath: '/payroll-history',
      },
      userA,
    );

    const rows = db
      .prepare('SELECT user_id, title, link_path FROM notifications WHERE company_id = ?')
      .all(companyId);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, userB);
    assert.equal(rows[0].title, 'Test payroll');
    assert.equal(rows[0].link_path, '/payroll-history');
  } finally {
    db.exec('ROLLBACK');
  }
});

test('notifyUser creates a readable notification row', () => {
  db.exec('BEGIN');
  try {
    const companyId = Number(
      db.prepare('INSERT INTO companies (name) VALUES (?)').run('Single Notify Co').lastInsertRowid,
    );
    const auth = require('../src/auth');
    const { hash, salt } = auth.hashPassword('testpass12');
    const userId = Number(
      db.prepare(
        'INSERT INTO users (company_id, email, password_hash, password_salt, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(companyId, 'notify-single@test.local', hash, salt, 'Solo', 'admin').lastInsertRowid,
    );

    notifications.notifyUser(userId, companyId, {
      kind: 'rate_schedule.verified',
      title: 'Rates checked',
      body: 'All good',
      linkPath: '/settings',
    });

    const row = db
      .prepare('SELECT kind, body, read_at FROM notifications WHERE user_id = ?')
      .get(userId);

    assert.equal(row.kind, 'rate_schedule.verified');
    assert.equal(row.body, 'All good');
    assert.equal(row.read_at, null);
  } finally {
    db.exec('ROLLBACK');
  }
});
