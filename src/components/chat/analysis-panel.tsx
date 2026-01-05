'use client';

// import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';

interface AnalysisResult {
  summary: string;
  chartType?: string;
  chartData?: any;
  explanation?: string;
  columns?: string[];
  aggregations?: string[];
  intent?: string;
}

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  isLoading: boolean;
}

// const COLORS = [
//   'hsl(var(--color-chart-1))',
//   'hsl(var(--color-chart-2))',
//   'hsl(var(--color-chart-3))',
//   'hsl(var(--color-chart-4))',
//   'hsl(var(--color-chart-5))',
// ];

export function AnalysisPanel({ result, isLoading }: AnalysisPanelProps) {
  const [showExplainability, setShowExplainability] = useState(true);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-border border-b px-6 py-4">
          <h2 className="text-foreground font-semibold">Analysis</h2>
        </div>
        <div className="scrollbar-hidden flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-border border-b px-6 py-4">
          <h2 className="text-foreground font-semibold">Analysis</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="space-y-4">
            <div className="bg-accent/10 mx-auto flex h-12 w-12 items-center justify-center rounded-lg">
              <svg
                className="text-accent h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-foreground mb-1 font-semibold">
                No analysis yet
              </h3>
              <p className="text-muted-foreground text-sm">
                Ask a question to see analysis results and visualizations
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-foreground font-semibold">Analysis Result</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowExplainability(!showExplainability)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="scrollbar-hidden flex-1 space-y-6 overflow-y-auto p-6">
        {/* Summary */}
        <div className="space-y-2">
          <h3 className="text-foreground text-sm font-semibold">Summary</h3>
          <p className="text-foreground text-sm leading-relaxed">
            {result.summary}
          </p>
        </div>

        {/* Chart - Recharts disabled for now */}
        {/* {result.chartData && (
          <div className="space-y-3">
            <h3 className="text-foreground text-sm font-semibold">
              Visualization
            </h3>
            <Card className="bg-card p-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {result.chartType === 'line' ? (
                    <LineChart
                      data={
                        result.chartData.datasets
                          ? [
                              {
                                data: result.chartData.datasets[0].data.map(
                                  (value: number, i: number) => ({
                                    name: result.chartData.labels[i],
                                    value,
                                  })
                                ),
                              },
                            ]
                          : []
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--color-border))"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--color-muted-foreground))"
                      />
                      <YAxis stroke="hsl(var(--color-muted-foreground))" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={COLORS[0]}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  ) : (
                    <BarChart
                      data={
                        result.chartData.datasets
                          ? [
                              {
                                data: result.chartData.datasets[0].data.map(
                                  (value: number, i: number) => ({
                                    name: result.chartData.labels[i],
                                    value,
                                  })
                                ),
                              },
                            ]
                          : []
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--color-border))"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--color-muted-foreground))"
                      />
                      <YAxis stroke="hsl(var(--color-muted-foreground))" />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill={COLORS[0]}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )} */}

        {/* Explainability */}
        {showExplainability && (
          <div className="border-border space-y-3 border-t pt-4">
            <h3 className="text-foreground text-sm font-semibold">
              🧠 Analysis Breakdown
            </h3>

            {result.intent && (
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium uppercase">
                  Detected Intent
                </label>
                <p className="text-foreground bg-secondary/50 rounded-lg p-3 text-sm">
                  {result.intent}
                </p>
              </div>
            )}

            {result.columns && result.columns.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium uppercase">
                  Columns Used
                </label>
                <div className="flex flex-wrap gap-2">
                  {result.columns.map((col) => (
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

            {result.aggregations && result.aggregations.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium uppercase">
                  Operations
                </label>
                <div className="flex flex-wrap gap-2">
                  {result.aggregations.map((agg) => (
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

            {result.explanation && (
              <div className="space-y-1.5">
                <label className="text-muted-foreground text-xs font-medium uppercase">
                  How
                </label>
                <p className="text-foreground bg-secondary/50 rounded-lg p-3 text-sm">
                  {result.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="border-border space-y-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2 bg-transparent"
          >
            <Download className="h-4 w-4" />
            Download Results
          </Button>
        </div>
      </div>
    </div>
  );
}
