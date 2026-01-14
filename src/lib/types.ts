export interface SimpleCodeResult {
  code: string;
  success: boolean;
}

export interface SummaryResult {
  summary: string;
}

export interface AnalysisResult {
  success: boolean;
  code: string;
  summary: string;
  result?: unknown;
  executionTime: number;
  chartType?: string;
  chartData?: unknown;
  chartConfig?: {
    xKey?: string;
    yKey?: string;
    seriesKeys?: string[];
  };
}
