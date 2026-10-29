import React, { useState } from 'react';
import {
  TrendingUp,
  Scale,
  Ruler,
  Calendar,
  Info,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import type { ChildProfile, GrowthRecord } from '../types/index.ts';
import {
  formatDateIndo,
  formatHeight,
  formatWeight,
  formatHeadCirc,
  WHO_WEIGHT_BOYS,
  WHO_HEIGHT_BOYS,
  getWHOGrowthStatus,
} from '../utils/growth.ts';

interface GrowthChartsProps {
  profile: ChildProfile;
  records: GrowthRecord[];
  onAddRecord: () => void;
}

export const GrowthCharts: React.FC<GrowthChartsProps> = ({
  profile,
  records,
  onAddRecord,
}) => {
  const [chartMetric, setChartMetric] = useState<'weight' | 'height'>('weight');
  const [activePoint, setActivePoint] = useState<GrowthRecord | null>(null);

  // Sort records by ageMonths
  const sortedRecords = [...records].sort((a, b) => a.ageMonths - b.ageMonths);

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 320;
  const padding = { top: 30, right: 30, bottom: 40, left: 50 };

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Max age on X axis (up to 24 months standard for toddler)
  const maxMonth = 24;

  // Min and Max values on Y axis
  const minY = chartMetric === 'weight' ? 2 : 45;
  const maxY = chartMetric === 'weight' ? 16 : 95;

  const getX = (month: number) => {
    return padding.left + (Math.min(month, maxMonth) / maxMonth) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - ((val - minY) / (maxY - minY)) * chartHeight;
  };

  const whoData = chartMetric === 'weight' ? WHO_WEIGHT_BOYS : WHO_HEIGHT_BOYS;

  // Build SVG Path strings for WHO bands
  const buildBandPath = () => {
    const topPoints = whoData
      .filter((d) => d.month <= maxMonth)
      .map((d) => `${getX(d.month)},${getY(d.p85)}`);
    const bottomPoints = whoData
      .filter((d) => d.month <= maxMonth)
      .reverse()
      .map((d) => `${getX(d.month)},${getY(d.p15)}`);
    return `M ${topPoints.join(' L ')} L ${bottomPoints.join(' L ')} Z`;
  };

  const buildP50Path = () => {
    const points = whoData
      .filter((d) => d.month <= maxMonth)
      .map((d) => `${getX(d.month)},${getY(d.p50)}`);
    return `M ${points.join(' L ')}`;
  };

  const buildChildDataPath = () => {
    const validRecords = sortedRecords.filter((r) =>
      chartMetric === 'weight' ? r.weightKg > 0 : r.heightCm > 0
    );
    if (validRecords.length === 0) return '';
    const points = validRecords.map((r) => {
      const val = chartMetric === 'weight' ? r.weightKg : r.heightCm;
      return `${getX(r.ageMonths)},${getY(val)}`;
    });
    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="space-y-6">
      {/* Chart Header & Controls */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Kurva Pertumbuhan Standar WHO
              </h2>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                WHO Child Growth Standards
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pantau kenaikan berat dan tinggi badan {profile.nickname} dalam pita pertumbuhan ideal
            </p>
          </div>

          {/* Metric Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#FAF8F5] p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => {
                  setChartMetric('weight');
                  setActivePoint(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  chartMetric === 'weight'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Berat Badan (kg)</span>
              </button>
              <button
                onClick={() => {
                  setChartMetric('height');
                  setActivePoint(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  chartMetric === 'height'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Tinggi Badan (cm)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-[#EDE8DF]">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-emerald-100/70 border border-emerald-300" />
            <span>Zona Normal WHO (P15 - P85)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-0.5 bg-emerald-600" />
            <span>Garis Median WHO (P50)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-900 border-2 border-white shadow-xs" />
            <span className="font-semibold text-slate-800">Data {profile.nickname}</span>
          </div>
        </div>

        {/* SVG Canvas Container */}
        <div className="relative w-full overflow-x-auto pt-2">
          <div className="min-w-[640px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none"
            >
              {/* Grid Lines Horizontal */}
              {[...Array(6)].map((_, i) => {
                const stepVal = minY + (i * (maxY - minY)) / 5;
                const yPos = getY(stepVal);
                return (
                  <g key={`y-grid-${i}`}>
                    <line
                      x1={padding.left}
                      y1={yPos}
                      x2={svgWidth - padding.right}
                      y2={yPos}
                      stroke="#E5E7EB"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 8}
                      y={yPos + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#9CA3AF"
                      className="font-mono tabular-nums"
                    >
                      {stepVal.toFixed(chartMetric === 'weight' ? 1 : 0)}
                    </text>
                  </g>
                );
              })}

              {/* Grid Lines Vertical (Months 0, 3, 6, 9, 12, 15, 18, 21, 24) */}
              {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((m) => {
                const xPos = getX(m);
                return (
                  <g key={`x-grid-${m}`}>
                    <line
                      x1={xPos}
                      y1={padding.top}
                      x2={xPos}
                      y2={svgHeight - padding.bottom}
                      stroke="#F3F4F6"
                    />
                    <text
                      x={xPos}
                      y={svgHeight - padding.bottom + 18}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6B7280"
                      className="font-medium"
                    >
                      {m === 0 ? 'Lahir' : `${m} bln`}
                    </text>
                  </g>
                );
              })}

              {/* WHO Ideal Band Polygon (P15 to P85) */}
              <path
                d={buildBandPath()}
                fill="#D1FAE5"
                opacity="0.45"
              />

              {/* WHO Median Line (P50) */}
              <path
                d={buildP50Path()}
                fill="none"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Child Growth Line */}
              <path
                d={buildChildDataPath()}
                fill="none"
                stroke="#0F172A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Child Data Points */}
              {sortedRecords.map((r) => {
                const val = chartMetric === 'weight' ? r.weightKg : r.heightCm;
                if (!val || val <= 0) return null;
                const cx = getX(r.ageMonths);
                const cy = getY(val);
                const isSelected = activePoint?.id === r.id;

                return (
                  <g key={`point-${r.id}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 6 : 4.5}
                      className="transition-all cursor-pointer"
                      fill={isSelected ? '#059669' : '#0F172A'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      onClick={() => setActivePoint(r)}
                      onMouseEnter={() => setActivePoint(r)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Active Data Point Inspection Card */}
          {activePoint && (
            <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                  {activePoint.ageMonths}m
                </div>
                <div>
                  <span className="font-bold text-emerald-950">
                    Pencatatan Usia {activePoint.ageMonths} Bulan ({formatDateIndo(activePoint.date)})
                  </span>
                  <div className="text-[11px] text-emerald-800 flex items-center gap-3 mt-0.5">
                    <span>Berat: <strong>{formatWeight(activePoint.weightKg)}</strong></span>
                    <span>Tinggi: <strong>{formatHeight(activePoint.heightCm)}</strong></span>
                    {activePoint.headCircumferenceCm && (
                      <span>LK: <strong>{formatHeadCirc(activePoint.headCircumferenceCm)}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {activePoint.notes && (
                <div className="text-slate-600 italic text-[11px]">
                  "{activePoint.notes}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Growth History Table */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Riwayat Pengukuran Berkala
            </h3>
            <p className="text-xs text-slate-500">
              Data berat badan, panjang/tinggi, dan lingkar kepala sejak lahir
            </p>
          </div>

          <button
            onClick={onAddRecord}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-[#FAF8F5] hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Catat Pengukuran</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 px-3 font-semibold">Usia</th>
                <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                <th className="py-2.5 px-3 font-semibold text-right">Berat (kg)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Tinggi (cm)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Lingkar Kepala</th>
                <th className="py-2.5 px-3 font-semibold">Status WHO</th>
                <th className="py-2.5 px-3 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRecords.map((item) => {
                const status = getWHOGrowthStatus(item.ageMonths, item.weightKg);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {item.ageMonths === 0 ? 'Lahir' : `${item.ageMonths} Bulan`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDateIndo(item.date)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right font-medium text-slate-800">
                      {formatWeight(item.weightKg)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right font-medium text-slate-800">
                      {formatHeight(item.heightCm)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-600">
                      {formatHeadCirc(item.headCircumferenceCm)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${status.badgeClass}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
