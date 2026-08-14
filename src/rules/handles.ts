/**
 * Weak farm-handle shape: 3+ Latin letters and a run of 5+ digits.
 * Underscores, hyphens, extra letters, and leading digits are allowed.
 * Not enough to auto-hide on its own.
 */
export function isDigitFarmHandle(handle: string): boolean {
  const h = handle.replace(/^@/, "")
  if (!/^[A-Za-z0-9_-]+$/.test(h)) return false
  if (!/\d{5,}/.test(h)) return false
  return h.replace(/[^A-Za-z]/g, "").length >= 3
}
