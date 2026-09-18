// Formats a phone number progressively into "+1 (XXX) XXX-XXXX" as the
// user types, so every phone field across the CRM saves the same way.
export function formatPhone(value) {
  // The field is controlled, so on every keystroke `value` is our own
  // previous "+1 (...)" output plus whatever the user just typed. Strip
  // that literal "+1" prefix first — otherwise its "1" gets re-counted as
  // a typed digit on every single keystroke, snowballing extra digits in.
  const s = String(value || "").replace(/^\+1/, "");
  let digits = s.replace(/\D/g, "");
  // Drop a leading US country-code "1" if it was pasted in some other form.
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
// ")", " ", "-"), which leaves the caret wherever the browser last put it
// unless we correct it. Deferring that correction (e.g. to the next
// animation frame) loses the race against the next keystroke during fast
// typing, so this sets the DOM value and caret synchronously, in the same
// tick as the keystroke, before also pushing the value into React state.
export function onPhoneChange(e, setValue) {
  const el = e.target;
  const formatted = formatPhone(el.value);
  el.value = formatted;
  try {
    el.setSelectionRange(formatted.length, formatted.length);
  } catch {}
  setValue(formatted);
}
