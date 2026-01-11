import { NextResponse } from 'next/server';
import { analyzeDataset } from '@/lib/llm-service'; // New two-step service
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

    // Run analysis (orchestration is now handled inside analyzeDataset)
    const analysis = await analyzeDataset(message, metadata);

    if (!analysis.success) {
      return NextResponse.json({
        success: false,
        analysis: {
          summary: analysis.summary,
          pythonCode: analysis.code,
          codeOutput: analysis.summary,
          executionTime: analysis.executionTime,
        },
      });
    }

    console.log('=== Analysis Complete ===');
    console.log(`Summary: ${analysis.summary}`);
    console.log(`Chart: ${analysis.chartType || 'none'}`);
    console.log('========================');

    return NextResponse.json({
      success: true,
      analysis: {
        summary: analysis.summary,
        pythonCode: analysis.code,
        codeOutput: JSON.stringify(analysis.result, null, 2),
        executionTime: analysis.executionTime,
        result: analysis.result,
        // Chart recommendation
        chartType: analysis.chartType,
        chartData: analysis.chartData,
        chartConfig: analysis.chartConfig,
        displayType: analysis.chartType,
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}