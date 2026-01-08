import { NextResponse } from 'next/server';
import { generatePythonCode } from '@/lib/llm-service';
import { getDatasetMetadata } from '@/lib/csv-service';
import { executePythonCode } from '@/lib/python-executor';
import { sanitizeCode } from '@/lib/code-sanitizer';
import { recommendChart, normalizeDataForChart } from '@/lib/chart-recommender';

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
    const generation = await generatePythonCode(message, metadata);

    // After generating code, before executing:
    const availableColumns = metadata.columns.map((c) => c.name);
    const sanitization = sanitizeCode(generation.code, availableColumns);

    if (!sanitization.isValid) {
      return NextResponse.json({
        success: false,
        analysis: {
          summary: generation.summary,
          pythonCode: generation.code,
          codeOutput: `Code validation failed: ${sanitization.errors.join(', ')}`,
          explanation:
            generation.explanation || 'The generated code contains unsafe patterns and was blocked.',
          executionTime: 0,
          intent: generation.intent,
          columns: generation.columns,
          aggregations: generation.aggregations,
        },
      });
    }

    // Log warnings if any
    if (sanitization.warnings.length > 0) {
      console.warn('Code sanitization warnings:', sanitization.warnings);
    }

    // Execute the sanitized code
    const execution = await executePythonCode(
      sanitization.sanitizedCode,
      metadata.filePath,
      metadata.columns
    );

    if (!execution.success) {
      return NextResponse.json({
        success: false,
        analysis: {
          summary: generation.summary,
          pythonCode: generation.code,
          codeOutput: execution.error || 'Unknown error',
          explanation: generation.explanation || execution.stderr || 'No additional details available',
          executionTime: execution.executionTime,
          intent: generation.intent,
          columns: generation.columns,
          aggregations: generation.aggregations,
        },
      });
    }

    // Analyze the output and recommend chart type
    const chartRec = recommendChart(execution.result);
    const chartData = normalizeDataForChart(execution.result, chartRec.chartType);

    console.log('=== Chart Recommendation ===');
    console.log(`Type: ${chartRec.chartType} (${chartRec.confidence})`);
    console.log(`Reason: ${chartRec.reason}`);
    console.log('============================');

    return NextResponse.json({
      success: true,
      analysis: {
        summary: generation.summary,
        pythonCode: generation.code,
        codeOutput: JSON.stringify(execution.result, null, 2),
        explanation: generation.explanation ? `${generation.explanation} — Executed in ${execution.executionTime}ms` : `Execution completed in ${execution.executionTime}ms`,
        executionTime: execution.executionTime,
        result: execution.result,
        intent: generation.intent,
        columns: generation.columns,
        aggregations: generation.aggregations,
        // Chart recommendation based on actual output
        chartType: chartRec.chartType !== 'table' && chartRec.chartType !== 'number' ? chartRec.chartType : undefined,
        chartConfidence: chartRec.confidence,
        chartReason: chartRec.reason,
        chartData: chartData?.data,
        chartConfig: chartData ? { xKey: chartData.xKey, yKey: chartData.yKey } : undefined,
        displayType: chartRec.chartType, // 'number', 'table', 'bar', 'line', etc.
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
