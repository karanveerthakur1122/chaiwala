/** First 8 chars for UI — safe if id is numeric or missing (avoids .slice on non-strings). */
export function shortOrderDisplayId(id) {
  const s = id === undefined || id === null ? '' : String(id)
  return s.length <= 8 ? s : s.slice(0, 8)
}
