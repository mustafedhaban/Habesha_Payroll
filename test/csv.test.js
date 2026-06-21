'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCSV } = require('../src/csv');

test('parses a simple header + rows', () => {
  const rows = parseCSV('a,b,c\n1,2,3\n4,5,6');
  assert.deepEqual(rows, [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
    ['4', '5', '6'],
  ]);
});

test('handles quoted fields containing commas', () => {
  const rows = parseCSV('name,note\n"Abebe, K.",hello');
  assert.deepEqual(rows, [
    ['name', 'note'],
    ['Abebe, K.', 'hello'],
  ]);
});

test('handles escaped double-quotes inside quoted fields', () => {
  const rows = parseCSV('x\n"she said ""hi"""');
  assert.deepEqual(rows, [['x'], ['she said "hi"']]);
});

test('handles CRLF line endings and a trailing newline', () => {
  const rows = parseCSV('a,b\r\n1,2\r\n');
  assert.deepEqual(rows, [
    ['a', 'b'],
    ['1', '2'],
  ]);
});

test('drops fully blank trailing lines', () => {
  const rows = parseCSV('a\n1\n\n');
  assert.deepEqual(rows, [['a'], ['1']]);
});
