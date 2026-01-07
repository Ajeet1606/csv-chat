import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://127.0.0.1:11434/v1',
  apiKey: 'ollama', // Required but ignored by Ollama
});

export async function generateQuestions(headers: string[], sampleData: string[][]): Promise<string[]> {
  try {
    const prompt = `
      You are a data analyst helper.
      Here are the headers of a CSV file: ${headers.join(', ')}.
      Here is some sample data (first few rows):
      ${sampleData.map(row => row.join(', ')).join('\n')}
      
      Based on this, generate 5 interesting questions a user could ask to analyze this data.
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
