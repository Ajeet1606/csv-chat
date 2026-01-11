
// ------------------------------------------------------------
// This module provides utilities for interacting with the local Ollama LLM
// and orchestrating the analysis flow (code generation -> execution -> summary).
// ------------------------------------------------------------

import OpenAI from 'openai';
import { DatasetMetadata } from './csv-service';
import { normalizeDataForChart, recommendChart } from './chart-recommender';
import { executePythonCode } from './python-executor';
import { sanitizeCode, wrapCodeWithSafetyChecks } from './code-sanitizer';

/**
 * Configuration for the Ollama endpoint.
 */
const openai = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1',
  apiKey: process.env.OLLAMA_API_KEY ?? 'ollama',
});

const MODEL_NAME = process.env.MODEL_NAME ?? 'mistral';

// -- Interfaces --

export interface SimpleCodeResult {
  code: string;
  success: boolean;
}

export interface SummaryResult {
  summary: string;
}

export interface AnalysisResult {
  success: boolean;
  code: string;
  summary: string;
  result?: unknown;
  executionTime: number;
  chartType?: string;
  chartData?: unknown;
  chartConfig?: {
    xKey?: string;
    yKey?: string;
    seriesKeys?: string[];
  };
}

// -- Helpers --

function cleanCodeResponse(code: string): string {
  return code
    .replace(/```python\s*/gi, '')
    .replace(/```\s*/gi, '')
    .replace(/^\s*Here\s*is\s*the\s*code[:]?\s*/i, '')
    .replace(/^\s*The\s*code\s*is[:]?\s*/i, '')
    .trim();
}



function sanitizeExecResult(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeExecResult);
  }
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    // If it's a plain object or null prototype, recurse
    if (proto === Object.prototype || proto === null) {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        sanitized[k] = sanitizeExecResult(v);
      }
      return sanitized;
    }
    // Otherwise stringify (handle weird objects if they survived python serialization)
    return String(value);
  }
  return value;
}

// -- Core Functions --

export async function generateQuestions(metadata: DatasetMetadata): Promise<string[]> {
  const columnsDescription = metadata.columns
    .map(c => `- ${c.name} (${c.type}): ${c.distinctCount} distinct values`)
    .join('\n');

  const prompt = `You are a data‑analysis assistant.
Dataset: ${metadata.fileName}
Columns:
${columnsDescription}

Sample rows (first 5):
${metadata.sampleRows.map(r => r.join(', ')).join('\n')}

Generate **exactly five** interesting questions a user could ask about this data.
Focus on valid analysis (trends, filtering, aggregation).
Return **only** the questions, one per line.`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    const content = completion.choices[0]?.message?.content ?? '';
    return content
      .split('\n')
      .map(q => q.replace(/^\d+[\.)]\s*/, '').trim())
      .filter(q => q.length > 0);
  } catch (err) {
    console.error('Failed to generate questions:', err);
    return [];
  }
}

export async function generateSimplePythonCode(
  query: string,
  metadata: DatasetMetadata,
): Promise<SimpleCodeResult> {
  const columnsDescription = metadata.columns
    .map(c => `- ${c.name} (${c.type})`)
    .join('\n');

  const prompt = `You are a Python data analyst.
Generate **strictly executable pandas code** to answer: "${query}"

Dataset Context:
${columnsDescription}

Rules:
1. "df" is already loaded.
2. Store result in "result".
3. "result" must be a DataFrame, Series, dict, or list.
4. For groupby, use .reset_index().
5. For single values, use {"value": x, "label": "..."}.
6. NO print(), NO .to_dict() (handled by system), NO plotting.
7. Use pd.to_datetime() if needed.
8. For rolling/mean, select ONLY numeric columns (e.g. df[['col']].rolling...).
9. If using time-based rolling (e.g. '30D'), you MUST sort the index first: .sort_index().

Output ONLY the code.`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: 'You generate python code for data analysis.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    });
    let code = completion.choices[0]?.message?.content ?? '';
    code = cleanCodeResponse(code);
    return { code, success: !!code };
  } catch (err) {
    console.error('Code gen failed:', err);
    return { code: '', success: false };
  }
}

export async function generateAnalysisSummary(
  query: string,
  code: string,
  result: unknown,
  executionTime: number,
): Promise<SummaryResult> {
  const preview = JSON.stringify(result).substring(0, 400);
  const prompt = `Summarize this analysis in 1 sentence.
Query: "${query}"
Code: ${code}
Result Preview: ${preview}`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
    });
    const summary = completion.choices[0]?.message?.content?.trim() || 'Analysis completed.';
    return {
      summary,
    };
  } catch {
    return {
      summary: 'Analysis completed',
    };
  }
}

// -- Main Orchestrator --

export async function analyzeDataset(
  query: string,
  metadata: DatasetMetadata
): Promise<AnalysisResult> {
  // 1. Generate Code
  const gen = await generateSimplePythonCode(query, metadata);
  if (!gen.success) {
    return {
      success: false,
      code: '',
      summary: 'Failed to generate code',
      executionTime: 0,
    };
  }

  // 2. Wrap & Sanitize Code using simpler internal logic
  const availableColumns = metadata.columns.map(c => c.name);
  const sanitization = sanitizeCode(gen.code, availableColumns);
  if (!sanitization.isValid) {
    return {
      success: false,
      code: gen.code,
      summary: 'Invalid code generated',
      executionTime: 0,
    };
  }

  const finalCode = wrapCodeWithSafetyChecks(sanitization.sanitizedCode, availableColumns);

  // 3. Execute
  const exec = await executePythonCode(finalCode, metadata.filePath, metadata.columns);
  if (!exec.success) {
    return {
      success: false,
      code: gen.code,
      summary: 'Code execution failed',
      // exec.error contains text like "Type error: ..."
      executionTime: exec.executionTime,
    };
  }

  // 4. Post-process Result
  const safeResult = sanitizeExecResult(exec.result);

  // 5. Summarize
  const summary = await generateAnalysisSummary(
    query,
    gen.code,
    safeResult,
    exec.executionTime
  );

  // 6. Charts
  const chartRec = recommendChart(safeResult);
  const chartData = normalizeDataForChart(safeResult, chartRec.chartType);

  return {
    success: true,
    code: gen.code,
    summary: summary.summary,
    result: safeResult,
    executionTime: exec.executionTime,
    chartType: chartRec.chartType,
    chartData: chartData?.data,
    chartConfig: chartData ? {
      xKey: chartData.xKey,
      yKey: chartData.yKey,
      seriesKeys: chartData.seriesKeys
    } : undefined
  };
}