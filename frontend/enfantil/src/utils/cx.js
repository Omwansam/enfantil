/** Joins class names, skipping falsy values. */
export function cx(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ')
}
