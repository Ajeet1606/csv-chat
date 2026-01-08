'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useState } from 'react';
// import {
//   BarChart,
//   Bar,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
// } from 'recharts';

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
    chartData?: any;
    explanation?: string;
    columns?: string[];
    aggregations?: string[];
    intent?: string;
  };
}

interface AssistantMessageProps {
  message: Message;
}

// const COLORS = [
//   'hsl(var(--color-chart-1))',
//   'hsl(var(--color-chart-2))',
//   'hsl(var(--color-chart-3))',
//   'hsl(var(--color-chart-4))',
//   'hsl(var(--color-chart-5))',
// ];

// const getChartColor = (colorIndex: number) => {
//   const colors = [
//     '#6d5fd1', // chart-1 (blue-purple)
//     '#4d9fcc', // chart-2 (cyan)
//     '#6db366', // chart-3 (green)
//     '#c4a034', // chart-4 (gold)
//     '#a6d654', // chart-5 (lime)
//   ];
//   return colors[colorIndex % colors.length];
// };

export function AssistantMessage({ message }: AssistantMessageProps) {
  const [expandedCode, setExpandedCode] = useState(true);
  const [expandedOutput, setExpandedOutput] = useState(true);
  // const [expandedChart, setExpandedChart] = useState(true);
  const [expandedExplainability, setExpandedExplainability] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

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
    } catch (e) {
      // no-op on copy failure
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
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.4 16.6L4.8 12l4.6-4.6M14.6 16.6l4.6-4.6-4.6-4.6" stroke="currentColor" strokeWidth="2" fill="none" />
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
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
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
                onClick={() => handleCopy(message.analysis!.codeOutput, 'output')}
                className="text-foreground/80 hover:text-foreground inline-flex items-center gap-1 text-xs"
                aria-label="Copy output"
              >
                {copiedOutput ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            {expandedOutput && (
              <div className="p-4">
                <pre className="bg-muted text-foreground overflow-x-auto rounded p-3 font-mono text-xs break-words whitespace-pre-wrap">
                  <code>{message.analysis.codeOutput}</code>
                </pre>
              </div>
            )}
          </Card>
        )}

        {/* Chart Visualization - Recharts disabled for now */}
        {/* {message.analysis.chartData && (
          <Card className="bg-card border-border overflow-hidden border">
            <button
              onClick={() => setExpandedChart(!expandedChart)}
              className="bg-muted/50 hover:bg-muted/70 border-border flex w-full items-center justify-between border-b px-4 py-3 transition-colors"
            >
              <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Visualization
              </span>
              {expandedChart ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedChart && (
              <div className="p-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {message.analysis.chartType === 'line' ? (
                      <LineChart
                        data={message.analysis.chartData.datasets.flatMap(
                          (dataset: any) =>
                            dataset.data.map((value: number, i: number) => ({
                              name: message.analysis.chartData.labels[i],
                              value,
                            }))
                        )}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--color-border))"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--color-muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis
                          stroke="hsl(var(--color-muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--color-background))',
                            border: '1px solid hsl(var(--color-border))',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={getChartColor(0)}
                          strokeWidth={3}
                          dot={false}
                          isAnimationActive={true}
                        />
                      </LineChart>
                    ) : (
                      <BarChart
                        data={message.analysis.chartData.datasets[0].data.map(
                          (value: number, i: number) => ({
                            name: message.analysis.chartData.labels[i],
                            value,
                          })
                        )}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--color-border))"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="hsl(var(--color-muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis
                          stroke="hsl(var(--color-muted-foreground))"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--color-background))',
                            border: '1px solid hsl(var(--color-border))',
                          }}
                        />
                        <Bar
                          dataKey="value"
                          fill={getChartColor(0)}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Card>
        )} */}

        {/* Explainability Section */}
        {message.analysis.explanation && (
          <Card className="bg-card border-border overflow-hidden border">
            <button
              onClick={() => setExpandedExplainability(!expandedExplainability)}
              className="bg-secondary/50 hover:bg-secondary/70 border-border flex w-full items-center justify-between border-b px-4 py-3 transition-colors"
            >
              <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <span className="text-base">🧠</span>
                Analysis Breakdown
              </span>
              {expandedExplainability ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedExplainability && (
              <div className="space-y-4 p-4">
                {message.analysis.intent && (
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs font-medium uppercase">
                      Detected Intent
                    </label>
                    <p className="text-foreground bg-secondary/50 rounded-lg p-3 text-sm">
                      {message.analysis.intent}
                    </p>
                  </div>
                )}

                {message.analysis.columns &&
                  message.analysis.columns.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-muted-foreground text-xs font-medium uppercase">
                        Columns Used
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {message.analysis.columns.map((col) => (
                          <span
                            key={col}
                            className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {message.analysis.aggregations &&
                  message.analysis.aggregations.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-muted-foreground text-xs font-medium uppercase">
                        Operations
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {message.analysis.aggregations.map((agg) => (
                          <span
                            key={agg}
                            className="bg-accent/10 text-accent rounded-full px-2.5 py-1 text-xs font-medium"
                          >
                            {agg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </Card>
        )}

        {/* Download Action */}
        <div>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Download Results
          </Button>
        </div>
      </div>
    </div>
  );
}
