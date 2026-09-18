// Formats a phone number progressively into "+1 (XXX) XXX-XXXX" as the
// user types, so every phone field across the CRM saves the same way.
export function formatPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  // Drop a leading US country-code "1" once a full 10-digit number follows it.
  if (digits.length === 11 && digits[0] === "1") digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (!digits) return "";

  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6, 10);

  let out = `+1 (${area}`;
  if (area.length === 3) out += ")";
  if (mid) out += ` ${mid}`;
  if (last) out += `-${last}`;
  return out;
}

// Reformatting on every keystroke changes the string length (adding "(",
// ")", " ", "-"), which can leave the caret in the wrong spot and garble
// fast typing. Use this as an <input onChange> to format the value and
// pin the caret to the end, so typing (or backspacing) stays append-only.
export function onPhoneChange(e, setValue) {
  const el = e.target;
  const formatted = formatPhone(el.value);
  setValue(formatted);
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(formatted.length, formatted.length);
    } catch {}
  });
}
