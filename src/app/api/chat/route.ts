import { NextResponse } from 'next/server';
import { generatePythonCode } from '@/lib/llm-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message || !context || !context.headers || !context.sampleData) {
      return NextResponse.json(
        { error: 'Invalid request: missing message or context' },
        { status: 400 }
      );
    }

    // Generate Python code for the query
    const code = await generatePythonCode(
      message,
      context.headers,
      context.sampleData
    );

    return NextResponse.json({
      success: true,
      analysis: {
        summary: 'Here is the Python code to analyze your data:',
        pythonCode: code,
        // In a real app, we would run the code here and return output/charts
        codeOutput: '# execution result would appear here',
        explanation: 'Generated code based on your request.',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
