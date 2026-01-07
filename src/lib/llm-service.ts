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

    const prompt = `
You are a senior data analyst generating SAFE, DETERMINISTIC Python code
that will be executed inside a restricted Docker sandbox.

Context:
- Dataset: ${metadata.fileName}
- A CSV file has already been loaded into a pandas DataFrame named "df"
- Available columns:
${columnsDescription}

Sample rows (for understanding only — do NOT hardcode values):
${metadata.sampleRows.map((row) => row.join(', ')).join('\n')}

User question:
"${query}"

You must respond with a JSON object containing:
1. "summary": A brief 1-2 sentence description of what the analysis does (user-friendly, no technical terms)
2. "code": The complete Python code to execute

PYTHON CODE REQUIREMENTS:
1. Use ONLY the dataframe variable named "df"
2. Perform ONLY data analysis or transformation
3. Do NOT generate charts, plots, or visualizations
4. The final result MUST be printed as JSON to stdout using: print(json.dumps(result))
5. For tabular results (DataFrame), use: result.to_dict(orient="records")
6. For Series results with simple keys, use: result.to_dict()
7. For single values, wrap in object: {"value": result}
8. Use only: pandas, numpy, json
9. Do NOT import matplotlib, seaborn, os, sys, subprocess, or any network libraries
10. Do NOT read or write any files

CRITICAL NOTES:
- Groupby operations MUST be aggregated (.sum(), .mean(), .count(), etc.) before using .nlargest() or .to_dict()
- Always ensure dictionary keys are JSON-serializable (str, int, float, bool, None only)
- Test your logic: groupby() -> aggregate() -> sort/filter -> convert to dict

COMMON PATTERNS (use these as templates):

1. Aggregate by group and get top N:
   result = df.groupby('Region')['Sales'].sum().nlargest(5).to_dict()
   print(json.dumps(result))

2. Get top N rows from DataFrame:
   result = df.nlargest(10, 'Revenue')[['Region', 'Product', 'Revenue']].to_dict(orient="records")
   print(json.dumps(result))

3. Single calculation:
   result = {"value": float(df['Sales'].sum())}
   print(json.dumps(result))

4. Multiple aggregations:
   result = df.groupby('Category').agg({'Sales': 'sum', 'Units': 'mean'}).reset_index().to_dict(orient="records")
   print(json.dumps(result))

5. Filtering and aggregating:
   result = df[df['Year'] == 2023].groupby('Region')['Revenue'].sum().to_dict()
   print(json.dumps(result))

ERROR HANDLING:
- If the question cannot be answered, code should print: print(json.dumps({"error": "reason"}))

Response format (JSON only, no markdown):
{
  "summary": "Finding the top regions by sales",
  "code": "import pandas as pd\\nimport json\\n\\nresult = df.groupby('Region')['Sales'].sum().nlargest(5).to_dict()\\nprint(json.dumps(result))"
}

Now generate the response:`;

    const completion = await openai.chat.completions.create({
      model: 'mistral',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content || '';

    console.log('=== LLM Raw Response ===');
    console.log(content);
    console.log('======================');

    // Try to parse as JSON first
    let parsedResponse: { summary?: string; code?: string } = {};
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
    }

    const code = parsedResponse.code || '';
    const summary = parsedResponse.summary || 'Analyzing your data';

    console.log('=== Extracted Summary ===');
    console.log(summary);
    console.log('=== Extracted Code ===');
    console.log(code);
    console.log('========================');

    return {
      code,
      summary,
    };
  } catch (error) {
    console.error('LLM code generation failed:', error);
    throw error;
  }
}
