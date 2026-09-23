/**
 * MySQL INSERT Statement Parser
 * Tokenizer berkecepatan tinggi tanpa backtracking regex berbahaya.
 * Mampu mem-parsing puluhan ribu baris SQL dump (phpMyAdmin / mysqldump) dalam hitungan milidetik.
 */

export interface ParsedTableData {
  tableName: string
  columns: string[]
  rows: Record<string, any>[]
}

export function parseMySqlDump(sql: string): Map<string, Record<string, any>[]> {
  const tableDataMap = new Map<string, Record<string, any>[]>()
  const len = sql.length
  let i = 0

  while (i < len) {
    // Lewati whitespace
    while (i < len && /\s/.test(sql[i])) i++
    if (i >= len) break

    // Cek komentar baris tunggal: -- atau #
    if (sql[i] === '#' || (sql[i] === '-' && sql[i + 1] === '-')) {
      while (i < len && sql[i] !== '\n') i++
      continue
    }

    // Cek block comment: /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      continue
    }

    // Cek perintah INSERT INTO
    if (
      (sql[i] === 'I' || sql[i] === 'i') &&
      sql.substring(i, i + 11).toUpperCase() === 'INSERT INTO'
    ) {
      i += 11
      // Lewati whitespace
      while (i < len && /\s/.test(sql[i])) i++

      // Baca nama tabel (bisa diapit backtick `, double quote ", single quote ', atau tanpa quote)
      let tableName = ''
      if (sql[i] === '`' || sql[i] === '"' || sql[i] === "'") {
        const quote = sql[i++]
        while (i < len && sql[i] !== quote) {
          tableName += sql[i++]
        }
        i++ // lewati quote penutup
      } else {
        while (i < len && /[a-zA-Z0-9_]/.test(sql[i])) {
          tableName += sql[i++]
        }
      }
      tableName = tableName.toLowerCase().trim()

      // Lewati whitespace
      while (i < len && /\s/.test(sql[i])) i++

      // Baca daftar kolom opsional: (`col1`, `col2`, ...)
      const columns: string[] = []
      if (sql[i] === '(') {
        i++
        let colBuf = ''
        while (i < len && sql[i] !== ')') {
          if (sql[i] === ',') {
            columns.push(colBuf.replace(/[`"'\s]/g, '').trim())
            colBuf = ''
          } else {
            colBuf += sql[i]
          }
          i++
        }
        if (colBuf.trim()) {
          columns.push(colBuf.replace(/[`"'\s]/g, '').trim())
        }
        if (i < len && sql[i] === ')') i++
      }

      // Lewati hingga kata kunci VALUES
      while (i < len) {
        if ((sql[i] === 'V' || sql[i] === 'v') && sql.substring(i, i + 6).toUpperCase() === 'VALUES') {
          i += 6
          break
        }
        i++
      }

      // Baca setiap tuple: (val1, val2), (val3, val4), ... sampai titik koma ';'
      const rows: Record<string, any>[] = []
      while (i < len) {
        // Lewati spasi dan koma pemisah antar-tuple
        while (i < len && (/\s/.test(sql[i]) || sql[i] === ',')) i++
        if (i >= len || sql[i] === ';') {
          if (sql[i] === ';') i++
          break
        }

        if (sql[i] === '(') {
          i++
          const tuple: any[] = []
          let valBuf = ''
          let inStr = false
          let strQuote = ''
          let escaped = false

          while (i < len) {
            const c = sql[i]

            if (escaped) {
              valBuf += c
              escaped = false
              i++
              continue
            }

            if (c === '\\') {
              escaped = true
              valBuf += c
              i++
              continue
            }

            if (inStr) {
              if (c === strQuote) {
                // Handle escaped double quote ('')
                if (i + 1 < len && sql[i + 1] === strQuote) {
                  valBuf += strQuote
                  i += 2
                  continue
                }
                inStr = false
              } else {
                valBuf += c
              }
              i++
              continue
            }

            if (c === "'" || c === '"') {
              inStr = true
              strQuote = c
              i++
              continue
            }

            if (c === ',') {
              tuple.push(cleanVal(valBuf))
              valBuf = ''
              i++
              continue
            }

            if (c === ')') {
              tuple.push(cleanVal(valBuf))
              valBuf = ''
              i++
              break
            }

            valBuf += c
            i++
          }

          // Petakan tuple ke objek nama kolom
          const rowObj: Record<string, any> = {}
          tuple.forEach((val, idx) => {
            const col = columns[idx] || `col_${idx}`
            rowObj[col] = val
          })
          rows.push(rowObj)
        } else {
          i++
        }
      }

      if (rows.length > 0) {
        if (!tableDataMap.has(tableName)) {
          tableDataMap.set(tableName, [])
        }
        tableDataMap.get(tableName)!.push(...rows)
      }
      continue
    }

    // Lewati statement lain selain INSERT INTO (misal CREATE TABLE, DROP TABLE, dll)
    while (i < len && sql[i] !== ';' && sql[i] !== '\n') i++
    if (i < len && sql[i] === ';') i++
  }

  return tableDataMap
}

function cleanVal(raw: string): any {
  const trimmed = raw.trim()
  if (trimmed === 'NULL' || trimmed === 'null' || trimmed === '') return null
  if (trimmed === 'TRUE' || trimmed === 'true') return true
  if (trimmed === 'FALSE' || trimmed === 'false') return false

  // Cek angka numerik (jika tidak diapit kutip)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }

  let val = trimmed
  // Bersihkan kutip pembungkus jika ada
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1)
  }

  return val
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
}
