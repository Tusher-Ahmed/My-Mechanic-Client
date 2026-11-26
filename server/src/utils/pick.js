/** Return a new object containing only the listed keys that are present (not undefined). */
export function pick(source = {}, keys) {
  const out = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}
