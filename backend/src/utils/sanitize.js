/**
 * Sanitize Airtable record data by removing read-only fields.
 * Read-only types (formula, rollup, lookup, count, createdTime,
 * lastModifiedTime, autoNumber, button, externalSyncSource) are excluded.
 *
 * @param {object} recordFields  The .fields object from an Airtable record.
 * @param {Array<object>} fieldMeta Array of field metadata ({name, type}).
 * @return {object} Sanitized fields map.
 */
const READ_ONLY_TYPES = new Set([
  'formula',
  'rollup',
  'lookup',
  'count',
  'createdTime',
  'lastModifiedTime',
  'autoNumber',
  'button',
  'externalSyncSource',
]);

function sanitizeRecord(recordFields, fieldMeta) {
  const out = {};
  for (const field of fieldMeta) {
    if (READ_ONLY_TYPES.has(field.type)) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(recordFields, field.name)) {
      out[field.name] = recordFields[field.name];
    }
  }
  return out;
}

module.exports = { sanitizeRecord };
