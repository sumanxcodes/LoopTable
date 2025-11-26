const { addDays, addMonths, lastDayOfMonth } = require('date-fns');

/**
 * Compute a safe monthly date: if target day exceeds days in month, clamp to last day.
 * @param {Date} dateBase       The base date to shift from
 * @param {number} monthsOffset Number of months to add (can be negative)
 * @returns {Date} shifted date
 */
function addMonthsSafe(dateBase, monthsOffset) {
  const target = addMonths(dateBase, monthsOffset);
  const baseDay = dateBase.getDate();
  const lastDay = lastDayOfMonth(target).getDate();
  const day = Math.min(baseDay, lastDay);
  target.setDate(day);
  return target;
}

/**
 * Apply field-level date shifting rules to a record's fields.
 * fieldConfig format: { fieldName: { type: 'relative', days: X, months: Y } }
 */
function applyDateShifts(fields, fieldConfig) {
  const result = { ...fields };
  const now = new Date();
  for (const [fieldName, rule] of Object.entries(fieldConfig)) {
    const val = fields[fieldName];
    if (!val) continue;
    const dateObj = new Date(val);
    let newDate = dateObj;
    if (rule.days) {
      newDate = addDays(newDate, rule.days);
    }
    if (rule.months) {
      newDate = addMonthsSafe(newDate, rule.months);
    }
    result[fieldName] = newDate.toISOString().split('T')[0];
  }
  return result;
}

module.exports = { addMonthsSafe, applyDateShifts };
