import DOMPurify from 'isomorphic-dompurify';

/**
 * sanitizeText — strips all HTML/script content from a plain text field.
 * Use this on every free-text input (names, notes, addresses, reasons)
 * before it is sent to Supabase. This is the app's primary defense against
 * stored XSS: even if an attacker submits <script>...</script> as their
 * "full name", what gets stored and later rendered is inert plain text.
 */
export function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  const clean = DOMPurify.sanitize(stringValue, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  return clean.trim();
}

/**
 * sanitizeCSVCell — neutralizes CSV/formula injection. If a cell's text
 * starts with =, +, -, @, or a tab/CR, Excel and Google Sheets can treat it
 * as a formula the moment the file is opened (e.g. an employee "full name"
 * of =HYPERLINK("http://evil.example","click") becomes a clickable link,
 * or worse, in the sheet whoever runs payroll opens). Prefixing with a
 * single quote forces spreadsheet apps to treat the value as plain text;
 * the quote itself is invisible once opened. This is separate from
 * sanitizeText, which guards against HTML/script — CSV injection is a
 * different sink and needs its own escaping even on already-sanitized text.
 */
export function sanitizeCSVCell(value) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(stringValue)) {
    return `'${stringValue}`;
  }
  return stringValue;
}

/**
 * sanitizeRichText — allows a small safe subset of formatting tags, for the
 * few fields that legitimately need it (e.g. offer letter body preview).
 * Everything else (scripts, iframes, event handlers, style injection) is
 * stripped regardless of what tag it's hiding in.
 */
export function sanitizeRichText(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  return DOMPurify.sanitize(stringValue, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * sanitizeEmail — trims, lowercases, and validates shape. Returns '' if the
 * value doesn't look like an email at all, so bad input never reaches the DB.
 */
export function sanitizeEmail(value) {
  const clean = sanitizeText(value).toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(clean) ? clean : '';
}

/**
 * sanitizePhone — keeps only digits, spaces, +, and -. Ethiopian numbers are
 * commonly written as +251 9XX XXX XXX or 09XX XXX XXX; this keeps both
 * valid while stripping anything else a malicious paste might contain.
 */
export function sanitizePhone(value) {
  if (!value) return '';
  return String(value).replace(/[^\d\s+\-]/g, '').trim();
}

/**
 * sanitizeNumber — coerces to a finite number, or returns 0. Prevents
 * NaN / Infinity / string-injection from ever reaching a numeric DB column.
 */
export function sanitizeNumber(value, { min = -Infinity, max = Infinity } = {}) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(Math.max(num, min), max);
}

/**
 * sanitizeTIN — Ethiopian TIN is a 10-digit numeric identifier. Strips
 * everything else and caps length.
 */
export function sanitizeTIN(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 10);
}

/**
 * sanitizeFormData — runs sanitizeText across every string value in a plain
 * object, leaving numbers/booleans/dates untouched. Handy as a last pass
 * right before an insert/update call, in addition to per-field sanitizers.
 */
export function sanitizeFormData(formObject) {
  const result = {};
  for (const [key, value] of Object.entries(formObject)) {
    result[key] = typeof value === 'string' ? sanitizeText(value) : value;
  }
  return result;
}
