/**
 * MySQL INSERT Statement Parser
 * Mengekstrak data tabel dan kolom dari file dump SQL MySQL (phpMyAdmin / mysqldump)
 */

export interface ParsedTableData {
  tableName: string
  columns: string[]
  rows: Record<string, any>[]
}

export function parseMySqlDump(sqlContent: string): Map<string, Record<string, any>[]> {
  const tableDataMap = new Map<string, Record<string, any>[]>()

  // Bersihkan komentar SQL (-- komentar dan /* komentar */)
  const cleanSql = sqlContent
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^--.*$/gm, '')

  // Regex mencari INSERT INTO `table` (`col1`, `col2`) VALUES (...)
  // atau INSERT INTO `table` VALUES (...)
  const insertRegex = /INSERT\s+INTO\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*(?:\(([^)]+)\))?\s*VALUES\s*([\s\S]*?);/gi

  let match: RegExpExecArray | null
  while ((match = insertRegex.exec(cleanSql)) !== null) {
    const rawTableName = match[1].toLowerCase().trim()
    const rawColumns = match[2]
    const rawValues = match[3]

    let columns: string[] = []
    if (rawColumns) {
      columns = rawColumns
        .split(',')
        .map(c => c.replace(/[`"'\s]/g, '').trim())
    }

    const rows = parseValueTuples(rawValues, columns)

    if (!tableDataMap.has(rawTableName)) {
      tableDataMap.set(rawTableName, [])
    }
    tableDataMap.get(rawTableName)!.push(...rows)
  }

  return tableDataMap
}

function parseValueTuples(rawValues: string, columns: string[]): Record<string, any>[] {
  const result: Record<string, any>[] = []
  let inString = false
  let stringChar = ''
  let escaped = false
  let currentTuple: string[] = []
  let currentVal = ''
  let inTuple = false

  for (let i = 0; i < rawValues.length; i++) {
    const char = rawValues[i]

    if (escaped) {
      currentVal += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      currentVal += char
      continue
    }

    if (inString) {
      if (char === stringChar) {
        // Cek double quotes escape ('')
        if (i + 1 < rawValues.length && rawValues[i + 1] === stringChar) {
          currentVal += stringChar
          i++
        } else {
          inString = false
        }
      } else {
        currentVal += char
      }
      continue
    }

    if (char === "'" || char === '"') {
      inString = true
      stringChar = char
      continue
    }

    if (char === '(' && !inTuple) {
      inTuple = true
      currentTuple = []
      currentVal = ''
      continue
    }

    if (char === ')' && inTuple) {
      currentTuple.push(cleanValue(currentVal))
      currentVal = ''
      inTuple = false

      // Konversi tuple array ke object berdasarkan kolom
      const rowObj: Record<string, any> = {}
      currentTuple.forEach((val, idx) => {
        const colName = columns[idx] || `col_${idx}`
        rowObj[colName] = val
      })
      result.push(rowObj)
      continue
    }

    if (char === ',' && inTuple) {
      currentTuple.push(cleanValue(currentVal))
      currentVal = ''
      continue
    }

    if (inTuple) {
      currentVal += char
    }
  }

  return result
}

function cleanValue(raw: string): any {
  const trimmed = raw.trim()
  if (trimmed === 'NULL' || trimmed === 'null' || trimmed === '') return null
  if (trimmed === 'TRUE' || trimmed === 'true') return true
  if (trimmed === 'FALSE' || trimmed === 'false') return false

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }

  // String unescaping
  return trimmed
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
}
