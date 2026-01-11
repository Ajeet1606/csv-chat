'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { ConfigurableChart, NumberDisplay, DataTable } from '@/components/chart/configurable-chart';

interface Message {
  id: string;
  type: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  analysis?: {
    summary: string;
    pythonCode: string;
    codeOutput: string;
    success?: boolean;
    chartType?: string;
    chartData?: Record<string, unknown>[];
    chartConfig?: { xKey?: string; yKey?: string };
    displayType?: string;  // 'number', 'table', 'bar', 'line', etc.
    explanation?: string;
    columns?: string[];
    aggregations?: string[];
    intent?: string;
    result?: unknown;
  };
}

interface AssistantMessageProps {
  message: Message;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const [expandedCode, setExpandedCode] = useState(true);
  const [expandedOutput, setExpandedOutput] = useState(true);
  const [expandedChart, setExpandedChart] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [tablePage, setTablePage] = useState(1);

  const handleCopy = async (text: string, type: 'code' | 'output') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1500);
      } else {
        setCopiedOutput(true);
        setTimeout(() => setCopiedOutput(false), 1500);
      }
    } catch {
      // no-op on copy failure
    }
  };

  const chartId = `chart-${message.id}`;

  const handleDownload = () => {
    try {
      const chartElement = document.getElementById(chartId);

      if (!chartElement) {
        console.error('Chart element not found with ID:', chartId);
        return;
      }

      // Find all SVG elements and select the largest one (the actual chart, not legend icons)
      const svgs = Array.from(chartElement.querySelectorAll('svg'));

      if (svgs.length === 0) {
        console.error('No SVG elements found in chart element');
        return;
      }

      // Get the largest SVG (the main chart, not small legend icons)
      const svg = svgs.reduce((largest, current) => {
        const largestSize =
          largest.getBoundingClientRect().width *
          largest.getBoundingClientRect().height;
        const currentSize =
          current.getBoundingClientRect().width *
          current.getBoundingClientRect().height;
        return currentSize > largestSize ? current : largest;
      });

      // Clone the SVG to avoid modifying the original
      const svgClone = svg.cloneNode(true) as SVGElement;

      // Set explicit dimensions if not present
      if (!svgClone.hasAttribute('width')) {
        svgClone.setAttribute(
          'width',
          svg.getBoundingClientRect().width.toString()
        );
      }
      if (!svgClone.hasAttribute('height')) {
        svgClone.setAttribute(
          'height',
          svg.getBoundingClientRect().height.toString()
        );
      }

      // Serialize SVG to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgClone);

      // Create blob and download link
      const blob = new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart-${message.id}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download chart:', error);
    }
  };

  if (!message.analysis) {
    return (
      <div className="flex justify-start">
        <div className="bg-secondary text-secondary-foreground max-w-2xl rounded-lg px-4 py-3 text-sm">
          <p className="leading-relaxed">{message.content}</p>
          <span className="mt-2 block text-xs opacity-70">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-2xl space-y-4">
        {/* Summary */}
        <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-sm">
          <p className="leading-relaxed">{message.content}</p>
          {message.analysis?.explanation && (
            <p className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">
              {message.analysis.explanation}
            </p>
          )}
          <span className="mt-2 block text-xs opacity-70">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Python Code */}
        {message.analysis.pythonCode && (
          <Card className="bg-card border-border overflow-hidden border">
            <div className="bg-primary/8 border-border flex w-full items-center justify-between border-b px-4 py-3">
              <button
                onClick={() => setExpandedCode(!expandedCode)}
                className="text-foreground flex items-center gap-2 text-sm font-semibold"
                aria-label="Toggle code"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9.4 16.6L4.8 12l4.6-4.6M14.6 16.6l4.6-4.6-4.6-4.6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                Python Code
                {expandedCode ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => handleCopy(message.analysis!.pythonCode, 'code')}
                className="text-foreground/80 hover:text-foreground inline-flex items-center gap-1 text-xs"
                aria-label="Copy code"
              >
                {copiedCode ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            {expandedCode && (
              <div className="p-4">
                <pre className="bg-muted text-foreground overflow-x-auto rounded p-3 font-mono text-xs">
                  <code>{message.analysis.pythonCode}</code>
                </pre>
              </div>
            )}
          </Card>
        )}

        {/* Code Output */}
        {message.analysis.codeOutput && (
          <Card className="bg-card border-border overflow-hidden border">
            <div
              className={
                `border-border flex w-full items-center justify-between border-b px-4 py-3 ` +
                (message.analysis.success === false
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-accent/8 text-foreground')
              }
            >
              <button
                onClick={() => setExpandedOutput(!expandedOutput)}
                className="flex items-center gap-2 text-sm font-semibold"
                aria-label="Toggle output"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Execution Output
                {expandedOutput ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() =>
                  handleCopy(message.analysis!.codeOutput, 'output')
                }
                className="text-foreground/80 hover:text-foreground inline-flex items-center gap-1 text-xs"
                aria-label="Copy output"
              >
                {copiedOutput ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            {expandedOutput && (
              <div className="p-4">
                <pre className="bg-muted text-foreground overflow-x-auto rounded p-3 font-mono text-xs wrap-break-word whitespace-pre-wrap">
                  <code>{message.analysis.codeOutput}</code>
                </pre>
              </div>
            )}
          </Card>
        )}

        {/* Visualization Section - Based on recommended chart type */}
        {message.analysis.success !== false && message.analysis.displayType && (
          <Card className="bg-card border-border overflow-hidden border">
            <div className="bg-muted/50 hover:bg-muted/70 border-border flex w-full items-center justify-between border-b px-4 py-3 transition-colors">
              <button
                onClick={() => setExpandedChart(!expandedChart)}
                className="text-foreground flex items-center gap-2 text-sm font-semibold"
              >
                {message.analysis.displayType === 'number' ? (
                  <span className="text-lg">📊</span>
                ) : message.analysis.displayType === 'table' ? (
                  <span className="text-lg">📋</span>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
                  </svg>
                )}
                {message.analysis.displayType === 'number'
                  ? 'Result'
                  : message.analysis.displayType === 'table'
                    ? 'Data Table'
                    : `${message.analysis.displayType.charAt(0).toUpperCase() + message.analysis.displayType.slice(1)} Chart`}
              </button>
              <div className="flex items-center gap-2">
                {message.analysis.displayType === 'table' &&
                  message.analysis.chartData && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTablePage(Math.max(1, tablePage - 1));
                        }}
                        disabled={tablePage === 1}
                        className="text-foreground/80 hover:text-foreground p-1 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-muted-foreground min-w-15 text-center text-xs">
                        Page {tablePage}/
                        {Math.ceil(message.analysis.chartData.length / 15)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const chartDataLength =
                            message.analysis?.chartData?.length ?? 0;
                          setTablePage(
                            Math.min(
                              Math.ceil(chartDataLength / 15),
                              tablePage + 1
                            )
                          );
                        }}
                        disabled={
                          tablePage >=
                          Math.ceil(
                            (message.analysis?.chartData?.length ?? 0) / 15
                          )
                        }
                        className="text-foreground/80 hover:text-foreground p-1 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                <button
                  onClick={() => setExpandedChart(!expandedChart)}
                  className="text-foreground"
                  aria-label="Toggle chart"
                >
                  {expandedChart ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {expandedChart && (
              <div className="p-4">
                {/* Single Number Display */}
                {message.analysis.displayType === 'number' &&
                  message.analysis.result != null && (
                    <NumberDisplay
                      value={
                        typeof message.analysis.result === 'object' &&
                        message.analysis.result !== null &&
                        'value' in message.analysis.result
                          ? Number(
                              (message.analysis.result as { value: number })
                                .value
                            )
                          : Number(message.analysis.result)
                      }
                      label={message.analysis.summary}
                    />
                  )}

                {/* Data Table Display */}
                {message.analysis.displayType === 'table' &&
                  message.analysis.chartData && (
                    <DataTable
                      data={message.analysis.chartData}
                      maxRows={15}
                      currentPage={tablePage}
                    />
                  )}

                {/* Chart Display */}
                {['bar', 'line', 'area', 'pie', 'scatter'].includes(
                  message.analysis.displayType
                ) &&
                  message.analysis.chartData && (
                    <ConfigurableChart
                      id={chartId}
                      type={
                        message.analysis.displayType as
                          | 'bar'
                          | 'line'
                          | 'area'
                          | 'pie'
                          | 'scatter'
                      }
                      data={message.analysis.chartData}
                      config={message.analysis.chartConfig}
                      height={280}
                    />
                  )}
              </div>
            )}
          </Card>
        )}

        {/* Download Action */}
        <div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={handleDownload}
            disabled={
              !['bar', 'line', 'area', 'pie', 'scatter'].includes(
                message.analysis.displayType || ''
              )
            }
          >
            <Download className="h-4 w-4" />
            Download Chart
          </Button>
        </div>
      </div>
    </div>
  );
}
