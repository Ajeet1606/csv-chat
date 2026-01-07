import { NextResponse } from 'next/server';
import { generatePythonCode } from '@/lib/llm-service';
import { getDatasetMetadata } from '@/lib/csv-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, datasetId } = body;

    if (!message || !datasetId) {
      return NextResponse.json(
        { error: 'Invalid request: missing message or datasetId' },
        { status: 400 }
      );
    }

    const metadata = await getDatasetMetadata(datasetId);
    if (!metadata) {
      return NextResponse.json(
        { error: 'Dataset not found or expired' },
        { status: 404 }
      );
    }

    // Generate Python code for the query
    const code = await generatePythonCode(message, metadata);

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
