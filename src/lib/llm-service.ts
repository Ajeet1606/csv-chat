import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://127.0.0.1:11434/v1',
  apiKey: 'ollama', // Required but ignored by Ollama
});

import { DatasetMetadata } from './csv-service';

export async function generateQuestions(metadata: DatasetMetadata): Promise<string[]> {
  try {
    const columnsDescription = metadata.columns
      .map(c => `- ${c.name} (${c.type}): ${c.distinctCount} distinct values`)
      .join('\n');

    const prompt = `
      You are a data analyst helper.
      Dataset: ${metadata.fileName}
      Context:
      ${columnsDescription}
      
      Sample data (first 5 rows):
      ${metadata.sampleRows.map(row => row.join(', ')).join('\n')}
      
      Based on this, generate 5 interesting questions a user could ask to analyze this data.
      Focus on questions that leverage the column types (e.g. time-series trends if dates exist, aggregations for numbers).
      Return ONLY the questions, one per line. Do not include numbering or extra text.
    `;

    const completion = await openai.chat.completions.create({
      model: 'mistral',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Split by new line and filter empty strings
    return content
      .split('\n')
      .map(q => q.replace(/^\d+[\.\)]\s*/, '').trim()) // Remove numbering like "1. " or "1) "
      .filter(q => q.length > 0);

  } catch (error) {
    console.error('LLM generation failed:', error);
    throw error; // Re-throw to be handled by the caller
  }
}


export interface CodeGenerationResult {
  code: string;
  summary: string;
  intent?: string;
  explanation?: string;
  columns?: string[];
  aggregations?: string[];
}

export async function generatePythonCode(
  query: string,
  metadata: DatasetMetadata
): Promise<CodeGenerationResult> {
  try {
    const columnsDescription = metadata.columns
      .map(
        (c) =>
          `- ${c.name} (${c.type}${c.min !== undefined ? `, min=${c.min}, max=${c.max}` : ''})`
      )
      .join('\n');

    const availableColumns = metadata.columns.map((c) => c.name);
    const numericColumns = metadata.columns
      .filter((c) => c.type === 'number')
      .map((c) => c.name);

    const prompt = `
You are a senior data analyst generating SAFE Python code for a Docker sandbox.

DATASET SCHEMA (use ONLY these exact column names):
${columnsDescription}

Sample data:
${metadata.sampleRows
  .slice(0, 3)
  .map((row) => row.join(', '))
  .join('\n')}

USER QUESTION: "${query}"

RESPOND WITH JSON (no markdown) using exactly these keys:
{
  "summary": "1-2 sentence user-friendly description",
  "intent": "short intent classification like 'top N by group' or 'sum of column'",
  "columns": ["list", "of", "columns", "used"],
  "aggregations": ["sum", "mean", "count"],
  "explanation": "1-2 sentence explanation of the plan",
  "code": "complete Python code as a single string"
}

STRICT CODE RULES:
1. Variable "df" is pre-loaded with the CSV data
2. Use ONLY column names from DATASET SCHEMA above - do NOT invent columns
3. Output MUST be: print(json.dumps(result))
4. For DataFrame results: .to_dict(orient="records")
5. For Series results: .to_dict() 
6. For single values: {"value": float(x)}
7. ONLY imports allowed: pandas, numpy, json (already imported)
8. NO: matplotlib, os, sys, subprocess, open(), eval(), exec()
9. Groupby MUST aggregate before .nlargest()/.to_dict()

COLUMN NAMES TO USE (copy exactly):
${availableColumns.map((c) => `"${c}"`).join(', ')}

WORKING EXAMPLES:
# Top N by group (CORRECT):
result = df.groupby('${availableColumns[0]}')['${numericColumns[0] || availableColumns[1]}'].sum().nlargest(5).to_dict()
print(json.dumps(result))

# Total calculation:
result = {"value": float(df['${numericColumns[0] || availableColumns[0]}'].sum())}
print(json.dumps(result))

# Filtered aggregation:
filtered = df[df['${availableColumns[0]}'] == df['${availableColumns[0]}'].iloc[0]]
result = filtered.to_dict(orient="records")[:10]
print(json.dumps(result))

Generate the response:`;

    const completion = await openai.chat.completions.create({
      model: 'mistral',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content || '';

    console.log('=== LLM Raw Response ===');
    console.log(content);
    console.log('======================');

    // Helpers to extract columns and aggregations from code as a fallback
    const extractAnalysisFromCode = (codeText: string, allowedColumns: string[]) => {
      const colSet = new Set<string>();
      const aggSet = new Set<string>();

      // Match df['col'] and df["col"] patterns
      const bracketColRegex = /df\s*\[\s*['\"]([^'\"]+)['\"]\s*\]/g;
      let m: RegExpExecArray | null;
      while ((m = bracketColRegex.exec(codeText)) !== null) {
        const col = m[1];
        if (allowedColumns.includes(col)) colSet.add(col);
      }

      // Match groupby('col') or groupby(["col"]) patterns
      const groupbyRegex = /groupby\s*\(\s*['\"]([^'\"]+)['\"]\s*\)|groupby\s*\(\s*\[\s*['\"]([^'\"]+)['\"]/g;
      while ((m = groupbyRegex.exec(codeText)) !== null) {
        const col = m[1] || m[2];
        if (col && allowedColumns.includes(col)) colSet.add(col);
      }

      // Simple aggregation keyword detection
      const aggKeywords = [
        'sum', 'mean', 'median', 'min', 'max', 'count', 'std', 'nlargest', 'nsmallest',
        'agg', 'size', 'unique', 'nunique', 'sort_values'
      ];
      for (const kw of aggKeywords) {
        const re = new RegExp(`\\.${kw}\\s*\(`);
        if (re.test(codeText)) aggSet.add(kw);
      }

      return {
        columns: Array.from(colSet),
        aggregations: Array.from(aggSet)
      };
    };

    // Try to parse as JSON first
    let parsedResponse: { summary?: string; code?: string; intent?: string; explanation?: string; columns?: string[]; aggregations?: string[] } = {};
    try {
      // Remove markdown fences if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const jsonContent = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedResponse = JSON.parse(jsonContent);

      if (!parsedResponse.summary || !parsedResponse.code) {
        throw new Error('Missing summary or code in response');
      }
    } catch (parseError) {
      console.error(
        'Failed to parse JSON response, falling back to extraction'
      );
      console.error(parseError);

      // Fallback: try to extract code from markdown fences
      const codeBlockMatch = content.match(/```(?:python)?\s*([\s\S]*?)```/i);
      if (codeBlockMatch) {
        parsedResponse.code = codeBlockMatch[1].trim();
      } else {
        // Try to find import statement
        const importMatch = content.match(/(import\s+[\s\S]*)/i);
        parsedResponse.code = importMatch ? importMatch[1] : content;
      }

      // Extract summary from any text before code
      const summaryMatch = content.match(/^([^`{]+)(?=```|{|import)/i);
      parsedResponse.summary = summaryMatch
        ? summaryMatch[1].trim()
        : 'Analyzing your data';

      // Fallback analysis extraction from code
      if (parsedResponse.code) {
        const fallback = extractAnalysisFromCode(parsedResponse.code, availableColumns);
        parsedResponse.columns = fallback.columns;
        parsedResponse.aggregations = fallback.aggregations;
      }
    }

    const code = parsedResponse.code || '';
    const summary = parsedResponse.summary || 'Analyzing your data';
    const intent = parsedResponse.intent || undefined;
    const explanation = parsedResponse.explanation || undefined;
    const columns = parsedResponse.columns || extractAnalysisFromCode(code, availableColumns).columns;
    const aggregations = parsedResponse.aggregations || extractAnalysisFromCode(code, availableColumns).aggregations;

    console.log('=== Extracted Summary ===');
    console.log(summary);
    if (intent) {
      console.log('=== Extracted Intent ===');
      console.log(intent);
    }
    if (explanation) {
      console.log('=== Extracted Explanation ===');
      console.log(explanation);
    }
    if (columns && columns.length) {
      console.log('=== Columns Used ===');
      console.log(columns.join(', '));
    }
    if (aggregations && aggregations.length) {
      console.log('=== Aggregations Detected ===');
      console.log(aggregations.join(', '));
    }
    console.log('=== Extracted Code ===');
    console.log(code);
    console.log('========================');

    return {
      code,
      summary,
      intent,
      explanation,
      columns,
      aggregations,
    };
  } catch (error) {
    console.error('LLM code generation failed:', error);
    throw error;
  }
}
