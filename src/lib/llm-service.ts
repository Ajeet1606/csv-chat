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


export async function generatePythonCode(
  query: string,
  metadata: DatasetMetadata
): Promise<string> {
  try {
    const columnsDescription = metadata.columns
      .map(c => `- ${c.name} (${c.type}${c.min !== undefined ? `, min=${c.min}, max=${c.max}` : ''})`)
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
${metadata.sampleRows.map(row => row.join(", ")).join("\n")}

User question:
"${query}"

STRICT REQUIREMENTS:
1. Use ONLY the dataframe variable named "df"
2. Perform ONLY data analysis or transformation
3. Do NOT generate charts, plots, or visualizations
4. Do NOT use print() for final results
5. The final result MUST be written to "output.json" as valid JSON
6. If the result is tabular, convert it using:
   result.to_dict(orient="records")
7. If the result is a single value, wrap it in an object:
   { "value": result }
8. Use only: pandas, numpy, json
9. Do NOT import matplotlib, seaborn, os, sys, subprocess, or any network libraries
10. Do NOT read or write any files except "output.json"
11. Return ONLY valid Python code. No markdown. No explanations.

ERROR HANDLING:
- If the question cannot be answered using the given columns,
  write this to output.json:
  { "error": "reason" }

Now generate the Python code.
`;

    const completion = await openai.chat.completions.create({
      model: "mistral",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    let content = completion.choices[0]?.message?.content || "";

    // Defensive cleanup in case the model adds code fences
    content = content
      .replace(/^```python\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    return content;

  } catch (error) {
    console.error("LLM code generation failed:", error);
    throw error;
  }
}
