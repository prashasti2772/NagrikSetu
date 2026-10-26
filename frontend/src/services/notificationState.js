export function hasUnread(rows) { return Array.isArray(rows) && rows.some(row=>row?.is_read === false); }
