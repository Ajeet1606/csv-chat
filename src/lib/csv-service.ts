import { parse } from 'csv-parse/sync';
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type ColumnType = "string" | "number" | "boolean" | "date";

export type ColumnMetadata = {
  name: string;
  type: ColumnType;
  nullable: boolean;
  distinctCount: number;
  min?: number;
  max?: number;
};

export type DatasetMetadata = {
  datasetId: string;
  fileName: string;
  fileSizeBytes: number;
  rowCountEstimate: number;
  columnCount: number;
  columns: ColumnMetadata[];
  sampleRows: string[][];
  createdAt: string;
  filePath: string;
};

export type ParsedCSV = {
  headers: string[];
  data: string[][];
};

function inferType(values: string[]): ColumnType {
  const nonEmpty = values.filter(v => v !== "");

  if (nonEmpty.length === 0) return "string";

  const isNumber = nonEmpty.every(v => !isNaN(Number(v)));
  if (isNumber) return "number";

  const isBoolean = nonEmpty.every(v =>
    v.toLowerCase() === "true" || v.toLowerCase() === "false"
  );
  if (isBoolean) return "boolean";

  const isDate = nonEmpty.every(v => !isNaN(Date.parse(v)));
  if (isDate) return "date";

  return "string";
}

export async function parseCSVWithMetadata(
  file: File,
  previewRows = 50
): Promise<DatasetMetadata> {
  const text = await file.text();

  const records = parse(text, {
    columns: false,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as string[][];

  if (records.length === 0) {
    throw new Error("CSV file is empty");
  }

  const headers = records[0];
  const rows = records.slice(1, previewRows + 1);

  const datasetId = crypto
    .createHash("sha256")
    .update(file.name + Date.now().toString())
    .digest("hex")
    .slice(0, 16);

  const columnsMetadata = headers.map((header, colIndex) => {
    const columnValues = rows.map(r => r[colIndex] ?? "");
    const type = inferType(columnValues);

    const nonEmpty = columnValues.filter(v => v !== "");
    const distinct = new Set(nonEmpty);

    const numericValues =
      type === "number"
        ? nonEmpty.map(v => Number(v))
        : [];

    return {
      name: header,
      type,
      nullable: nonEmpty.length < columnValues.length,
      distinctCount: distinct.size,
      min: numericValues.length ? Math.min(...numericValues) : undefined,
      max: numericValues.length ? Math.max(...numericValues) : undefined,
    };
  });

  const fileName = `${datasetId}.csv`;
  const filePath = path.join(process.cwd(), "data", "uploads", fileName);

  const metadata: DatasetMetadata = {
    datasetId,
    fileName: file.name,
    fileSizeBytes: file.size,
    rowCountEstimate: records.length - 1,
    columnCount: headers.length,
    columns: columnsMetadata,
    sampleRows: rows,
    createdAt: new Date().toISOString(),
    filePath,
  };

  await persistDataset(metadata, text);

  return metadata;
}


const METADATA_FILE = path.join(
  process.cwd(),
  "data",
  "datasets-metadata.json"
);

async function persistDataset(metadata: DatasetMetadata, content: string) {
  // Ensure both metadata dir and uploads dir exist
  await fs.mkdir(path.dirname(METADATA_FILE), { recursive: true });
  await fs.mkdir(path.dirname(metadata.filePath), { recursive: true });

  // Save the actual CSV file
  await fs.writeFile(metadata.filePath, content, "utf-8");

  // Update the metadata JSON registry
  let existing: Record<string, DatasetMetadata> = {};

  try {
    const raw = await fs.readFile(METADATA_FILE, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // file does not exist yet
  }

  existing[metadata.datasetId] = metadata;

  await fs.writeFile(
    METADATA_FILE,
    JSON.stringify(existing, null, 2),
    "utf-8"
  );
}

export async function getDatasetMetadata(
  datasetId: string
): Promise<DatasetMetadata | null> {
  try {
    const raw = await fs.readFile(METADATA_FILE, "utf-8");
    const existing: Record<string, DatasetMetadata> = JSON.parse(raw);
    return existing[datasetId] || null;
  } catch (error) {
    console.error("Failed to read metadata file:", error);
    return null;
  }
}

