'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';

export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'scatter';

// Color palette for charts
const COLORS = [
  'var(--color-primary)',
  'hsl(221, 83%, 53%)', // blue
  'hsl(142, 71%, 45%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(0, 84%, 60%)', // red
  'hsl(270, 76%, 63%)', // purple
  'hsl(199, 89%, 48%)', // cyan
  'hsl(24, 95%, 53%)', // orange
];

export interface ChartConfig {
  xKey?: string;
  yKey?: string;
  nameKey?: string;
  valueKey?: string;
  seriesKeys?: string[];
}

export interface ConfigurableChartProps {
  type: ChartType;
  data: Record<string, unknown>[];
  config?: ChartConfig;
  height?: number;
  id?: string;
}

/**
 * Configurable Chart Component
 * Just pass data and type - it handles the rest
 */
export function ConfigurableChart({
  type,
  data,
  config,
  height = 280,
  id,
}: ConfigurableChartProps) {
  if (!data || data.length === 0) return null;

  // Determine keys from config or auto-detect
  const keys = Object.keys(data[0]);
  const xKey = config?.xKey || config?.nameKey || 'name' || keys[0];
  const yKey = config?.yKey || config?.valueKey || 'value' || keys[1];

  // Cap data for visual clarity
  const chartData =
    type === 'pie'
      ? capData(data, 10)
      : type === 'bar'
        ? capData(data, 30)
        : data.slice(0, 100);

  // Common components
  const grid = (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="hsl(var(--color-border))"
      opacity={0.5}
    />
  );

  const tooltip = (
    <Tooltip
      contentStyle={{
        backgroundColor: 'hsl(var(--color-background))',
        border: '1px solid hsl(var(--color-border))',
        borderRadius: '8px',
        fontSize: '12px',
      }}
      labelStyle={{ fontWeight: 600 }}
      cursor={{ fill: 'transparent' }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter={(value: any, name: any) => [
        typeof value === 'number'
          ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
          : value,
        name,
      ]}
    />
  );

  const xAxisProps = {
    dataKey: xKey,
    stroke: 'hsl(var(--color-muted-foreground))',
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: 'hsl(var(--color-border))' },
  };

  const yAxisProps = {
    stroke: 'hsl(var(--color-muted-foreground))',
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: 'hsl(var(--color-border))' },
    width: 60,
  };

  return (
    <div style={{ width: '100%', height }} id={id}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            {grid}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {tooltip}
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
            />
            {config?.seriesKeys && config.seriesKeys.length > 0 ? (
              config.seriesKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              ))
            ) : (
              <Bar
                dataKey={yKey}
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            )}
          </BarChart>
        ) : type === 'line' ? (
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            {grid}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {tooltip}
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
            />
            {config?.seriesKeys && config.seriesKeys.length > 0 ? (
              config.seriesKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{
                    fill: COLORS[index % COLORS.length],
                    strokeWidth: 0,
                    r: 3,
                  }}
                  activeDot={{ r: 5 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={yKey}
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-primary)', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
          </LineChart>
        ) : type === 'area' ? (
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            {grid}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {tooltip}
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
            />
            {config?.seriesKeys && config.seriesKeys.length > 0 ? (
              config.seriesKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={yKey}
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        ) : type === 'pie' ? (
          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            {tooltip}
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: '11px' }}
            />
            <Pie
              data={chartData}
              dataKey={yKey}
              nameKey={xKey}
              cx="40%"
              cy="50%"
              outerRadius={90}
              innerRadius={40}
              paddingAngle={2}
              label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        ) : type === 'scatter' ? (
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {grid}
            <XAxis {...xAxisProps} type="number" dataKey={xKey} name={xKey} />
            <YAxis {...yAxisProps} type="number" dataKey={yKey} name={yKey} />
            {tooltip}
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
            />
            <Scatter
              data={chartData}
              fill="var(--color-primary)"
              opacity={0.7}
            />
          </ScatterChart>
        ) : null}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Cap data to max items, aggregating the rest as "Other"
 */
function capData(
  data: Record<string, unknown>[],
  max: number
): Record<string, unknown>[] {
  if (data.length <= max) return data;

  // Find the value key
  const valueKey =
    Object.keys(data[0]).find((k) => typeof data[0][k] === 'number') || 'value';
  const nameKey =
    Object.keys(data[0]).find((k) => typeof data[0][k] === 'string') || 'name';

  const head = data.slice(0, max - 1);
  const tailSum = data
    .slice(max - 1)
    .reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0);

  return [...head, { [nameKey]: 'Other', [valueKey]: tailSum }];
}

/**
 * Single Number Display Component
 * For displaying single metric values prominently
 */
export function NumberDisplay({
  value,
  label,
}: {
  value: number | string;
  label?: string;
}) {
  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : value;

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-primary text-4xl font-bold">{formattedValue}</div>
      {label && (
        <div className="text-muted-foreground mt-2 text-sm">{label}</div>
      )}
    </div>
  );
}

/**
 * Data Table Component
 * For displaying tabular data with pagination
 */
export function DataTable({
  data,
  maxRows = 20,
  currentPage = 1,
}: {
  data: Record<string, unknown>[];
  maxRows?: number;
  currentPage?: number;
}) {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);
  const startIdx = (currentPage - 1) * maxRows;
  const endIdx = startIdx + maxRows;
  const displayData = data.slice(startIdx, endIdx);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b">
            {columns.map((col) => (
              <th
                key={col}
                className="text-muted-foreground px-3 py-2 text-left font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, i) => (
            <tr key={i} className="border-border border-b last:border-0">
              {columns.map((col) => (
                <td key={col} className="text-foreground px-3 py-2">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-muted-foreground mt-2 text-center text-xs">
        Showing {startIdx + 1}-{Math.min(endIdx, data.length)} of {data.length} rows
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

// Re-export for backward compatibility
export { ConfigurableChart as ChartRenderer };
