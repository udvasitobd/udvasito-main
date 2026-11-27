/**
 * Small RFC 4180 CSV reader for the team's data files (UTF-8, header row, comma-separated, double-quoted fields
 * may hold commas, quotes ("") and line breaks). Strips a UTF-8 BOM; accepts LF or CRLF line endings.
 */

export type CsvRecord = { line: number; values: Record<string, string> };

export class CsvError extends Error {}

/** Parses into rows of raw cells; each row carries the line it started on (1-based). */
export function parseCsvRows(text: string): { line: number; cells: string[] }[] {
  const src = text.startsWith('﻿') ? text.slice(1) : text;
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  let i = 0;
  const endRow = () => {
    cells.push(cell);
    // A blank line is skipped, not read as a row with one empty cell.
    if (!(cells.length === 1 && cells[0] === '')) rows.push({ line: rowLine, cells });
    cells = [];
    cell = '';
  };
  while (i < src.length) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      if (ch === '\n') line++;
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      if (cell !== '') throw new CsvError(`line ${line}: a quote inside an unquoted value`);
      quoted = true;
    } else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else if (ch === '\r' && src[i + 1] === '\n') {
      // handled by the \n on the next step
    } else if (ch === '\n') {
      endRow();
      line++;
      rowLine = line;
    } else {
      cell += ch;
    }
    i++;
  }
  if (quoted) throw new CsvError(`line ${rowLine}: a quoted value is never closed`);
  if (cell !== '' || cells.length > 0) endRow();
  return rows;
}

/** Header row → records keyed by column name. Checks that every required column is present and every row has the header's width. */
export function parseCsv(text: string, requiredColumns: readonly string[]): { columns: string[]; records: CsvRecord[] } {
  const rows = parseCsvRows(text);
  if (rows.length === 0) throw new CsvError('the file is empty (it needs at least the header row)');
  const columns = rows[0]!.cells.map((c) => c.trim());
  const missing = requiredColumns.filter((c) => !columns.includes(c));
  if (missing.length > 0) throw new CsvError(`header is missing column(s): ${missing.join(', ')}`);
  const records = rows.slice(1).map(({ line, cells }) => {
    if (cells.length !== columns.length) {
      throw new CsvError(`line ${line}: ${cells.length} values, but the header has ${columns.length} columns`);
    }
    return { line, values: Object.fromEntries(columns.map((c, j) => [c, cells[j]!])) };
  });
  return { columns, records };
}
