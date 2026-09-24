import React, { useState, useMemo, useRef } from 'react';
import {
  ServerHistoryChartPoint,
  ServerHistoryRange,
  ServerHistorySummary,
} from '../../types/server';
import { cn } from '../../utils/cn';
import { Users, Activity, TrendingUp, ShieldAlert } from 'lucide-react';

export interface ServerHistoryChartProps {
  chart: ServerHistoryChartPoint[];
  summary: ServerHistorySummary;
  range: ServerHistoryRange;
  onRangeChange: (range: ServerHistoryRange) => void;
  maxCapacity?: number;
  isLoading?: boolean;
}

export const ServerHistoryChart: React.FC<ServerHistoryChartProps> = ({
  chart,
  summary,
  range,
  onRangeChange,
  maxCapacity = 32,
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // SVG dimensions
  const width = 800;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Compute Y-scale ceiling (at least maxCapacity or highest peak + headroom)
  const maxVal = useMemo(() => {
    const highestInChart = chart.reduce(
      (max, p) => Math.max(max, p.peakCount || p.playerCount || 0),
      0
    );
    const ceiling = Math.max(maxCapacity, highestInChart, summary.peakPlayers, 10);
    // Round up to multiple of 4 or 8
    return Math.ceil(ceiling / 4) * 4;
  }, [chart, maxCapacity, summary.peakPlayers]);

  // Points coordinates calculation
  const points = useMemo(() => {
    if (!chart || chart.length === 0) return [];
    const count = chart.length;
    const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth;

    return chart.map((p, idx) => {
      const x = paddingLeft + idx * stepX;
      const countVal = Math.max(0, Math.min(maxVal, p.playerCount || 0));
      const y = paddingTop + chartHeight - (countVal / maxVal) * chartHeight;
      return { x, y, point: p };
    });
  }, [chart, chartWidth, chartHeight, maxVal]);

  // SVG Area path string
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const bottomY = (paddingTop + chartHeight).toFixed(1);
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [points, paddingTop, chartHeight]);

  // SVG Line path string
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [points]);

  // Y-axis tick values (0, 25%, 50%, 75%, 100%)
  const yTicks = useMemo(() => {
    return [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(Math.round);
  }, [maxVal]);

  // X-axis label indices (e.g. 5 to 7 labels evenly distributed)
  const xLabels = useMemo(() => {
    if (!chart || chart.length === 0) return [];
    const labelCount = Math.min(chart.length, 6);
    const step = (chart.length - 1) / (labelCount - 1);
    const labels: Array<{ x: number; text: string }> = [];

    for (let i = 0; i < labelCount; i++) {
      const idx = Math.min(chart.length - 1, Math.round(i * step));
      const pt = chart[idx];
      const date = new Date(pt.timestamp);
      let text = '';

      if (range === '24h') {
        text = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (range === '7d') {
        text = date.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
      } else {
        text = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      labels.push({
        x: paddingLeft + (idx / Math.max(1, chart.length - 1)) * chartWidth,
        text,
      });
    }

    return labels;
  }, [chart, chartWidth, range]);

  // Peak line Y coordinate
  const peakY = paddingTop + chartHeight - (Math.min(maxVal, summary.peakPlayers) / maxVal) * chartHeight;
  // Average line Y coordinate
  const avgY = paddingTop + chartHeight - (Math.min(maxVal, summary.averagePlayers) / maxVal) * chartHeight;

  // Handle pointer tracking for tooltip
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = clientX * scaleX;

    // Find nearest point
    let closestIdx = 0;
    let minDistance = Infinity;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div className="bg-sand-50 border border-sand-200 rounded-xl p-4 sm:p-5 shadow-soft space-y-4">
      {/* Chart Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-sand-200">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-olive-600" />
          <h3 className="font-semibold text-sm text-ink tracking-tight uppercase">
            Player History & Capacity
          </h3>
          <span className="text-xs text-ink-muted font-mono">
            ({range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'})
          </span>
        </div>

        {/* Range Selector Pills (24h, 7d, 30d) */}
        <div className="flex items-center space-x-1 bg-sand-100 p-1 rounded-lg border border-sand-200 self-start sm:self-auto">
          {(['24h', '7d', '30d'] as ServerHistoryRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-md transition-all font-mono',
                range === r
                  ? 'bg-olive-700 text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-sand-200/60'
              )}
            >
              {r === '24h' ? '24 Hours' : r === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Micro Highlights */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-olive-600" />
          <span>Current: <b className="text-ink">{summary.currentPlayers}</b></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-0.5 bg-amber-500 border-dashed" />
          <span>Peak: <b className="text-amber-600">{summary.peakPlayers}</b></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-0.5 bg-olive-400" />
          <span>Average: <b className="text-olive-700">{summary.averagePlayers}</b></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-olive-600" />
          <span>Uptime: <b className="text-ink">{summary.uptimePercentage}%</b></span>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden select-none"
        onPointerLeave={() => setHoverIndex(null)}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-sand-50/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center space-x-2 text-xs font-mono text-ink-muted">
              <span className="animate-spin w-4 h-4 border-2 border-olive-600 border-t-transparent rounded-full" />
              <span>Loading telemetry history…</span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onPointerMove={handlePointerMove}
        >
          <defs>
            {/* Area gradient under curve */}
            <linearGradient id="serverChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a5634" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#7a8b54" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#7a8b54" stopOpacity="0.0" />
            </linearGradient>
            {/* Offline hatch pattern */}
            <pattern id="offlineHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#8b4a32" strokeWidth="1.5" strokeOpacity="0.25" />
            </pattern>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((val) => {
            const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
            return (
              <g key={`y-${val}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="rgba(74, 86, 52, 0.12)"
                  strokeDasharray="2 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-ink-muted text-[10px] font-mono select-none"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Peak guideline if peak is present */}
          {summary.peakPlayers > 0 && peakY >= paddingTop && (
            <g>
              <line
                x1={paddingLeft}
                y1={peakY}
                x2={width - paddingRight}
                y2={peakY}
                stroke="#6e541f"
                strokeWidth="1"
                strokeDasharray="4 3"
                strokeOpacity="0.6"
              />
              <text
                x={width - paddingRight}
                y={peakY - 4}
                textAnchor="end"
                className="fill-amber-600 text-[9px] font-mono font-bold"
              >
                PEAK {summary.peakPlayers}
              </text>
            </g>
          )}

          {/* Average guideline */}
          {summary.averagePlayers > 0 && avgY >= paddingTop && (
            <g>
              <line
                x1={paddingLeft}
                y1={avgY}
                x2={width - paddingRight}
                y2={avgY}
                stroke="#5a6840"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.4"
              />
              <text
                x={paddingLeft + 4}
                y={avgY - 4}
                textAnchor="start"
                className="fill-olive-700 text-[9px] font-mono"
              >
                AVG {summary.averagePlayers}
              </text>
            </g>
          )}

          {/* Filled Area */}
          {areaPath && (
            <path d={areaPath} fill="url(#serverChartAreaGrad)" />
          )}

          {/* Main Chart Stroke */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#3a4428"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-Axis bottom boundary line */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={width - paddingRight}
            y2={paddingTop + chartHeight}
            stroke="rgba(74, 86, 52, 0.25)"
            strokeWidth="1"
          />

          {/* X-Axis Labels */}
          {xLabels.map((lbl, idx) => (
            <g key={`x-${idx}`}>
              <line
                x1={lbl.x}
                y1={paddingTop + chartHeight}
                x2={lbl.x}
                y2={paddingTop + chartHeight + 4}
                stroke="rgba(74, 86, 52, 0.3)"
              />
              <text
                x={lbl.x}
                y={paddingTop + chartHeight + 16}
                textAnchor="middle"
                className="fill-ink-muted text-[10px] font-mono select-none"
              >
                {lbl.text}
              </text>
            </g>
          ))}

          {/* Interactive Hover Crosshair & Data Indicator */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={paddingTop + chartHeight}
                stroke="#4a5634"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="4.5"
                className="fill-olive-700 stroke-sand-50 stroke-2"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Box */}
        {activePoint && (
          <div
            className="absolute pointer-events-none z-20 top-2 transform -translate-x-1/2 bg-paper-50 border border-sand-300 rounded-lg p-2.5 shadow-md font-mono text-xs space-y-1 min-w-[160px]"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              transform: `translate(${activePoint.x > width * 0.75 ? '-95%' : activePoint.x < width * 0.25 ? '5%' : '-50%'}, 0)`,
            }}
          >
            <div className="flex items-center justify-between text-[11px] border-b border-sand-200 pb-1 font-semibold text-ink">
              <span>
                {new Date(activePoint.point.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded font-bold uppercase',
                  activePoint.point.isOnline
                    ? 'bg-olive-50 text-olive-700'
                    : 'bg-crimson-50 text-crimson-700'
                )}
              >
                {activePoint.point.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-ink-muted flex items-center gap-1">
                <Users className="w-3 h-3 text-olive-600" />
                Players:
              </span>
              <span className="font-bold text-ink text-sm">
                {activePoint.point.playerCount}
                <span className="text-[10px] text-ink-muted font-normal"> / {activePoint.point.maxPlayers}</span>
              </span>
            </div>

            {activePoint.point.mapName && (
              <div className="flex items-center justify-between text-[10px] text-ink-muted pt-0.5 truncate">
                <span>Map:</span>
                <span className="font-semibold text-ink truncate max-w-[110px]" title={activePoint.point.mapName}>
                  {activePoint.point.mapName}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
