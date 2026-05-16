/**
 * RFC 4180-style CSV with UTF-8 BOM for Excel compatibility.
 * @param {unknown} val
 * @returns {string}
 */
export function escapeCsvField(val) {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * @param {string[]} headers
 * @param {unknown[][]} rows
 * @returns {string}
 */
export function rowsToCsv(headers, rows) {
  const lines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ]
  return lines.join('\r\n')
}

/**
 * @param {string} filename
 * @param {string} csvString
 */
export function downloadCsv(filename, csvString) {
  const blob = new Blob(['\ufeff', csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * @param {string} filename
 * @param {string[]} headers
 * @param {unknown[][]} rows
 */
export function exportCsv(filename, headers, rows) {
  downloadCsv(filename, rowsToCsv(headers, rows))
}
