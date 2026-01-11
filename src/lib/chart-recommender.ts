/**
 * Chart Recommender - Analyzes data output and recommends the best chart type
 * This runs AFTER Python execution, based on actual data shape
 */

export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'scatter'
  | 'table'
  | 'number';

export interface ChartRecommendation {
  chartType: ChartType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  config?: {
    xKey?: string;
    yKey?: string;
    nameKey?: string;
    valueKey?: string;
  };
}

interface DataAnalysis {
  isObject: boolean;
  isArray: boolean;
  isSingleValue: boolean;
  isNumericMap: boolean; // {key: number} - good for bar/pie
  isRecordArray: boolean; // [{...}, {...}] - good for table/bar/line
  isNumericArray: boolean; // [1, 2, 3]
  isXYData: boolean; // [{x, y}, ...] - good for scatter
  isTimeSeries: boolean; // has date-like keys
  keyCount: number;
  recordCount: number;
  keys: string[];
  numericKeys: string[];
  dateKeys: string[];
}

/**
 * Analyze the shape and type of data
 */
function analyzeData(data: unknown): DataAnalysis {
  const analysis: DataAnalysis = {
    isObject: false,
    isArray: false,
    isSingleValue: false,
    isNumericMap: false,
    isRecordArray: false,
    isNumericArray: false,
    isXYData: false,
    isTimeSeries: false,
    keyCount: 0,
    recordCount: 0,
    keys: [],
    numericKeys: [],
    dateKeys: [],
  };

  if (data === null || data === undefined) {
    return analysis;
  }

  // Single value: {value: X} or just a number/string
  if (typeof data === 'number' || typeof data === 'string') {
    analysis.isSingleValue = true;
    return analysis;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    analysis.isObject = true;
    analysis.keys = keys;
    analysis.keyCount = keys.length;

    // Check for single value pattern: {value: X}
    if (keys.length === 1 && keys[0] === 'value') {
      analysis.isSingleValue = true;
      return analysis;
    }

    // Check if it's an error
    if (keys.includes('error')) {
      return analysis;
    }

    // Check if all values are numeric (good for bar/pie chart)
    const allNumeric = keys.every((k) => typeof obj[k] === 'number');
    if (allNumeric && keys.length > 1) {
      analysis.isNumericMap = true;
      analysis.numericKeys = keys;

      // Check if keys look like dates
      const datePattern =
        /^\d{4}-\d{2}|^\d{2}\/\d{2}|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
      if (keys.some((k) => datePattern.test(k))) {
        analysis.isTimeSeries = true;
        analysis.dateKeys = keys.filter((k) => datePattern.test(k));
      }
    }

    return analysis;
  }

  if (Array.isArray(data)) {
    analysis.isArray = true;
    analysis.recordCount = data.length;

    if (data.length === 0) {
      return analysis;
    }

    // Check if array of numbers
    if (data.every((item) => typeof item === 'number')) {
      analysis.isNumericArray = true;
      return analysis;
    }

    // Check if array of records
    const first = data[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      analysis.isRecordArray = true;
      const keys = Object.keys(first);
      analysis.keys = keys;
      analysis.keyCount = keys.length;

      // Identify numeric and date keys
      for (const key of keys) {
        const sampleValues = data
          .slice(0, 10)
          .map((r) => (r as Record<string, unknown>)[key]);

        if (
          sampleValues.every(
            (v) =>
              typeof v === 'number' ||
              (typeof v === 'string' && !isNaN(Number(v)))
          )
        ) {
          analysis.numericKeys.push(key);
        }

        const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/;
        if (
          sampleValues.some((v) => typeof v === 'string' && datePattern.test(v))
        ) {
          analysis.dateKeys.push(key);
        }
      }

      // Check for x/y scatter data pattern
      if (keys.includes('x') && keys.includes('y')) {
        analysis.isXYData = true;
      }

      // Check if it's time series data
      if (analysis.dateKeys.length > 0) {
        analysis.isTimeSeries = true;
      }
    }
  }

  return analysis;
}

/**
 * Recommend the best chart type based on data analysis
 */
export function recommendChart(data: unknown): ChartRecommendation {
  const analysis = analyzeData(data);

  // Error or empty data
  if (!analysis.isObject && !analysis.isArray) {
    if (analysis.isSingleValue) {
      return {
        chartType: 'number',
        confidence: 'high',
        reason: 'Single numeric value - display as metric',
      };
    }
    return {
      chartType: 'table',
      confidence: 'low',
      reason: 'Unknown data structure',
    };
  }

  // Handle error responses
  if (analysis.isObject && analysis.keys.includes('error')) {
    return {
      chartType: 'table',
      confidence: 'high',
      reason: 'Error response - display as text',
    };
  }

  // Single value in object
  if (analysis.isSingleValue) {
    return {
      chartType: 'number',
      confidence: 'high',
      reason: 'Single value result - display as large number',
    };
  }

  // Numeric map: {category: value} - perfect for bar or pie
  if (analysis.isNumericMap) {
    // Time series with date-like keys -> line chart
    if (analysis.isTimeSeries) {
      return {
        chartType: 'line',
        confidence: 'high',
        reason: 'Time series data detected (date keys with numeric values)',
        config: { nameKey: 'name', valueKey: 'value' },
      };
    }

    // Few categories -> pie chart
    if (analysis.keyCount <= 6) {
      return {
        chartType: 'pie',
        confidence: 'high',
        reason: `${analysis.keyCount} categories - suitable for pie chart`,
        config: { nameKey: 'name', valueKey: 'value' },
      };
    }

    // More categories -> bar chart
    return {
      chartType: 'bar',
      confidence: 'high',
      reason: `Category to value mapping (${analysis.keyCount} categories) - ideal for bar chart`,
      config: { nameKey: 'name', valueKey: 'value' },
    };
  }

  // Array of records
  if (analysis.isRecordArray) {
    // Scatter plot data
    if (analysis.isXYData) {
      return {
        chartType: 'scatter',
        confidence: 'high',
        reason: 'X/Y coordinate data - perfect for scatter plot',
        config: { xKey: 'x', yKey: 'y' },
      };
    }

    // Time series records
    if (analysis.isTimeSeries && analysis.numericKeys.length > 0) {
      const dateKey = analysis.dateKeys[0];
      const valueKey =
        analysis.numericKeys.find((k) => k !== dateKey) ||
        analysis.numericKeys[0];
      return {
        chartType: 'line',
        confidence: 'high',
        reason: 'Time series records with dates - line chart recommended',
        config: { xKey: dateKey, yKey: valueKey },
      };
    }

    // Find string/category keys vs numeric keys
    const stringKeys = analysis.keys.filter(
      (k) => !analysis.numericKeys.includes(k)
    );

    // Has category column + numeric columns -> bar chart
    if (
      stringKeys.length >= 1 &&
      analysis.numericKeys.length >= 1 &&
      analysis.recordCount <= 50
    ) {
      return {
        chartType: 'bar',
        confidence: 'high',
        reason: `Category column (${stringKeys[0]}) with numeric values - bar chart`,
        config: { xKey: stringKeys[0], yKey: analysis.numericKeys[0] },
      };
    }

    // All numeric columns, no category -> this is likely missing group keys, show as table
    if (stringKeys.length === 0 && analysis.numericKeys.length > 0) {
      return {
        chartType: 'table',
        confidence: 'medium',
        reason: 'All numeric columns without category labels - showing as table (data may be missing group keys)',
      };
    }

    // Many records or complex structure -> table
    if (analysis.recordCount > 20 || analysis.keyCount > 4) {
      return {
        chartType: 'table',
        confidence: 'medium',
        reason: `Large dataset (${analysis.recordCount} rows, ${analysis.keyCount} columns) - table view best`,
      };
    }

    // Default for small record arrays with at least one string key
    if (stringKeys.length >= 1) {
      return {
        chartType: 'bar',
        confidence: 'low',
        reason: 'Array of records - attempting bar chart',
        config: {
          xKey: stringKeys[0],
          yKey: analysis.numericKeys[0] || analysis.keys[1],
        },
      };
    }

    // No good category column found -> table
    return {
      chartType: 'table',
      confidence: 'low',
      reason: 'No suitable category column for chart - showing as table',
    };
  }

  // Numeric array
  if (analysis.isNumericArray) {
    return {
      chartType: 'line',
      confidence: 'medium',
      reason: 'Array of numbers - line chart for sequence',
    };
  }

  // Default fallback
  return {
    chartType: 'table',
    confidence: 'low',
    reason: 'Complex or unrecognized data structure - showing as table',
  };
}

/**
 * Normalize data for chart rendering
 * Converts various data shapes into a consistent format for recharts
 */
export function normalizeDataForChart(
  data: unknown,
  chartType: ChartType
): { data: Record<string, unknown>[]; xKey: string; yKey: string; seriesKeys?: string[] } | null {
  if (!data) return null;

  // Object map {key: value} -> array [{name: key, value: value}]
  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    // Skip error objects
    if ('error' in obj) return null;

    // Single value
    if (Object.keys(obj).length === 1 && 'value' in obj) {
      return null; // Will be displayed as number, not chart
    }

    const normalized = Object.entries(obj)
      .filter(([, v]) => typeof v === 'number')
      .map(([name, value]) => ({ name, value: value as number }));

    if (normalized.length === 0) return null;

    return { data: normalized, xKey: 'name', yKey: 'value' };
  }

  // Array of records - pass through with key hints
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const records = data as Record<string, unknown>[];
    const keys = Object.keys(records[0]);

    // Find best x and y keys
    const numericKeys = keys.filter((k) =>
      records
        .slice(0, 5)
        .every((r) => typeof r[k] === 'number' || !isNaN(Number(r[k])))
    );
    const stringKeys = keys.filter((k) => !numericKeys.includes(k));

    // For scatter, use x/y if present
    if (chartType === 'scatter' && keys.includes('x') && keys.includes('y')) {
      return { data: records, xKey: 'x', yKey: 'y' };
    }

    const xKey = stringKeys[0] || keys[0];
    const yKey = numericKeys[0] || keys[1] || keys[0];

    // If we have a date key (or x-axis key), a string key (category), and a numeric key (value)
    const dateKey = keys.find(k => /date|time|year|month/i.test(k) && stringKeys.includes(k)) || stringKeys[0];
    const categoryKey = stringKeys.find(k => k !== dateKey);
    const valueKey = numericKeys[0];

    // Enable pivoting for line, bar, area charts
    const multiSeriesTypes: ChartType[] = ['line', 'bar', 'area'];

    if (multiSeriesTypes.includes(chartType) && dateKey && categoryKey && valueKey) {
      // Pivot data: Group by dateKey, columns are values of categoryKey
      const pivotedMap = new Map<string, Record<string, unknown>>();
      const allSeries = new Set<string>();

      records.forEach(row => {
        const xVal = String(row[dateKey]);
        const series = String(row[categoryKey]);
        const val = row[valueKey];

        allSeries.add(series);

        if (!pivotedMap.has(xVal)) {
          pivotedMap.set(xVal, { [dateKey]: xVal });
        }
        const entry = pivotedMap.get(xVal)!;
        entry[series] = val;
      });

      const pivotedData = Array.from(pivotedMap.values());
      return {
        data: pivotedData,
        xKey: dateKey,
        yKey: valueKey, // Primary value key kept for reference
        seriesKeys: Array.from(allSeries)
      };
    }

    return { data: records, xKey, yKey };
  }

  // Array of numbers -> convert to records
  if (Array.isArray(data) && data.every((item) => typeof item === 'number')) {
    const normalized = data.map((value, index) => ({
      name: `${index + 1}`,
      value,
    }));
    return { data: normalized, xKey: 'name', yKey: 'value' };
  }

  return null;
}
