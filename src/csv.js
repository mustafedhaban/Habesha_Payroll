'use strict';

/**
 * Minimal RFC-4180-ish CSV parser — the inverse of the csvEscape logic used
 * for exports. Handles quoted fields, escaped quotes ("" inside a quoted
 * field), and both CRLF and LF line endings. No external dependency.
 *
 * @param {string} text - raw CSV content
 * @returns {string[][]} array of rows, each an array of cell strings
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      endField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // swallow CR; the following LF (if any) ends the row
      if (text[i + 1] === '\n') i += 1;
      endRow();
      i += 1;
      continue;
    }
    if (ch === '\n') {
      endRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // flush trailing field/row if the file doesn't end with a newline
  if (field !== '' || row.length > 0) endRow();

  // drop fully-empty trailing rows (e.g. a blank final line)
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

module.exports = { parseCSV };
