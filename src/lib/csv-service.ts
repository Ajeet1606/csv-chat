import { parse } from 'csv-parse/sync';

export interface ParsedCSV {
  headers: string[];
  data: string[][];
}

export async function parseCSVPreview(file: File, previewRows = 5): Promise<ParsedCSV> {
  const text = await file.text();
  
  const records = parse(text, {
    columns: false,
    skip_empty_lines: true,
    to: previewRows + 1, // +1 for header
    relax_quotes: true,
  });

  if (records.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = records[0] as string[];
  const data = records.slice(1) as string[][];

  return { headers, data };
}
