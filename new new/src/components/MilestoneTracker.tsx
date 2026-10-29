import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  Award,
  ChevronRight,
  Calendar,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import type { MilestoneChecklistItem } from '../types/index.ts';
import { formatDateIndo } from '../utils/growth.ts';

interface MilestoneTrackerProps {
  milestones: MilestoneChecklistItem[];
  childName: string;
  onToggleMilestone: (id: string) => void;
  onOpenUploadMilestone: () => void;
}

const DOMAINS: { id: string; label: string }[] = [
  { id: 'all', label: 'Semua Aspek' },
  { id: 'motorik_kasar', label: 'Motorik Kasar' },
  { id: 'motorik_halus', label: 'Motorik Halus' },
  { id: 'bahasa', label: 'Bahasa & Bicara' },
  { id: 'kognitif', label: 'Kognitif & Sensorik' },
  { id: 'sosial', label: 'Sosial Emosional' },
];

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  milestones,
  childName,
  onToggleMilestone,
  onOpenUploadMilestone,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  const total = milestones.length;
  const completedCount = milestones.filter((m) => m.completed).length;
  const percentage = Math.round((completedCount / total) * 100);

  const filtered = milestones.filter((m) => {
    if (selectedDomain === 'all') return true;
    return m.domain === selectedDomain;
  });

  return (
    <div className="space-y-6">
      {/* Overview Banner & Progress */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Buku Milestone Perkembangan
              </h2>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Pedoman IDAI & WHO
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pantau setiap pencapaian penting motorik, bahasa, dan kognitif {childName}
            </p>
          </div>

          <button
            onClick={onOpenUploadMilestone}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>+ Catat Milestone Momen</span>
          </button>
        </div>

        {/* Progress Bar Card */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E9E4DB] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Pencapaian Perkembangan Anak
            </span>
            <span className="font-bold text-slate-900 tabular-nums">
              {completedCount} dari {total} Milestone Tercapai ({percentage}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-500 italic">
            "Setiap anak berkembang dengan kecepatannya masing-masing. Berikan cinta dan stimulasi konsisten setiap hari."
          </p>
        </div>

        {/* Domain Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-[#EDE8DF]">
          {DOMAINS.map((domain) => (
            <button
              key={domain.id}
              onClick={() => setSelectedDomain(domain.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                selectedDomain === domain.id
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-[#FAF8F5] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-slate-200/60'
              }`}
            >
              {domain.label}
            </button>
          ))}
        </div>
      </div>

      {/* Milestone Checklist Items */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => onToggleMilestone(item.id)}
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
              item.completed
                ? 'bg-[#F9FCFA] border-emerald-200/80 shadow-xs'
                : 'bg-[#FFFDF9] border-[#EDE8DF] hover:border-slate-300'
            }`}
          >
            {/* Interactive Toggle Hitbox (min 44px for touch ergonomics) */}
            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 -mt-2">
              {item.completed ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
              ) : (
                <Circle className="w-6 h-6 text-slate-300 hover:text-slate-400" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {item.ageRangeLabel}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {item.domain.replace('_', ' ').toUpperCase()}
                </span>
                {item.completed && item.completedDate && (
                  <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Tercapai {formatDateIndo(item.completedDate)}
                  </span>
                )}
              </div>

              <h4
                className={`text-sm sm:text-base font-bold ${
                  item.completed ? 'text-slate-800 line-through decoration-slate-300' : 'text-slate-900'
                }`}
              >
                {item.title}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
