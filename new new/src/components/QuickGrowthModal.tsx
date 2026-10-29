import React, { useState, useEffect } from 'react';
import { X, Scale, Ruler, Brain, Calendar, Check, Plus, Minus, Sparkles, TrendingUp } from 'lucide-react';

interface QuickGrowthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number;
  initialHeight?: number;
  initialHeadCirc?: number;
  childName: string;
  onSave: (data: {
    date: string;
    weightKg?: number;
    heightCm?: number;
    headCircumferenceCm?: number;
    notes?: string;
  }) => void;
}

export const QuickGrowthModal: React.FC<QuickGrowthModalProps> = ({
  isOpen,
  onClose,
  initialWeight = 10.4,
  initialHeight = 81.2,
  initialHeadCirc = 46.5,
  childName,
  onSave,
}) => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState<number>(initialWeight);
  const [heightCm, setHeightCm] = useState<number>(initialHeight);
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<number>(initialHeadCirc);
  const [locationNote, setLocationNote] = useState<string>('Posyandu / Klinik');
  const [customNote, setCustomNote] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialWeight) setWeightKg(initialWeight);
      if (initialHeight) setHeightCm(initialHeight);
      if (initialHeadCirc) setHeadCircumferenceCm(initialHeadCirc);
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [isOpen, initialWeight, initialHeight, initialHeadCirc]);

  if (!isOpen) return null;

  const adjustWeight = (delta: number) => {
    setWeightKg((prev) => Math.max(1, Math.round((prev + delta) * 10) / 10));
  };

  const adjustHeight = (delta: number) => {
    setHeightCm((prev) => Math.max(30, Math.round((prev + delta) * 10) / 10));
  };

  const adjustHead = (delta: number) => {
    setHeadCircumferenceCm((prev) => Math.max(25, Math.round((prev + delta) * 10) / 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullNote = customNote.trim()
      ? `${locationNote ? `[${locationNote}] ` : ''}${customNote.trim()}`
      : `Pemeriksaan pertumbuhan di ${locationNote || 'Rumah'}`;

    onSave({
      date,
      weightKg: Number(weightKg) || undefined,
      heightCm: Number(heightCm) || undefined,
      headCircumferenceCm: Number(headCircumferenceCm) || undefined,
      notes: fullNote,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFDF9] rounded-t-3xl sm:rounded-3xl border border-[#EDE8DF] shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EDE8DF] flex items-center justify-between sticky top-0 bg-[#FFFDF9]/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Input Cepat Ukuran Anak
              </h2>
              <p className="text-[11px] text-slate-500">
                Pembaruan Berat & Tinggi {childName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
          {/* Tanggal Pemeriksaan */}
          <div className="flex items-center justify-between bg-[#FAF8F5] p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Tanggal Pengukuran</span>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* 1. Input Berat Badan (BB) */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Berat Badan (BB)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Standar Posyandu / Timbangan Digital
                  </span>
                </div>
              </div>

              {/* Stepper +/- */}
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => adjustWeight(-0.1)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  max="50"
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-16 text-center font-bold text-base text-slate-900 focus:outline-hidden"
                />
                <span className="text-xs font-semibold text-slate-500">kg</span>
                <button
                  type="button"
                  onClick={() => adjustWeight(0.1)}
                  className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Increment Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-[11px]">
              <span className="text-[10px] text-slate-400 font-medium">Cepat:</span>
              <button
                type="button"
                onClick={() => adjustWeight(0.1)}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
              >
                +100 gr
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(0.2)}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
              >
                +200 gr
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(0.5)}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
              >
                +500 gr
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(-0.1)}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-rose-400 text-slate-600 font-medium cursor-pointer whitespace-nowrap"
              >
                -100 gr
              </button>
            </div>
          </div>

          {/* 2. Input Tinggi Badan (TB) */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-sky-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
                  <Ruler className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Tinggi / Panjang Badan
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Pengukuran meteran / stadiometer
                  </span>
                </div>
              </div>

              {/* Stepper +/- */}
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => adjustHeight(-0.5)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="150"
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                  className="w-16 text-center font-bold text-base text-slate-900 focus:outline-hidden"
                />
                <span className="text-xs font-semibold text-slate-500">cm</span>
                <button
                  type="button"
                  onClick={() => adjustHeight(0.5)}
                  className="w-7 h-7 rounded-lg bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-800 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Increment Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-[11px]">
              <span className="text-[10px] text-slate-400 font-medium">Cepat:</span>
              <button
                type="button"
                onClick={() => adjustHeight(0.5)}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-sky-400 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
              >
                +0.5 cm
              </button>
              <button
                type="button"
                onClick={() => adjustHeight(1.0)}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-sky-400 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
              >
                +1.0 cm
              </button>
              <button
                type="button"
                onClick={() => adjustHeight(2.0)}
                className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-sky-400 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
              >
                +2.0 cm
              </button>
            </div>
          </div>

          {/* 3. Input Lingkar Kepala (LK) */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Lingkar Kepala (Opsional)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Standar kurva lingkar kepala
                  </span>
                </div>
              </div>

              {/* Stepper +/- */}
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => adjustHead(-0.5)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="70"
                  inputMode="decimal"
                  value={headCircumferenceCm}
                  onChange={(e) => setHeadCircumferenceCm(parseFloat(e.target.value) || 0)}
                  className="w-16 text-center font-bold text-base text-slate-900 focus:outline-hidden"
                />
                <span className="text-xs font-semibold text-slate-500">cm</span>
                <button
                  type="button"
                  onClick={() => adjustHead(0.5)}
                  className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Location & Notes */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-slate-800">
              Lokasi / Catatan Pengukuran
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
              {['Posyandu Mawar', 'Klinik Dokter Anak', 'Puskesmas', 'Timbang di Rumah'].map(
                (loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocationNote(loc)}
                    className={`px-2.5 py-1 rounded-xl font-medium border text-xs cursor-pointer whitespace-nowrap transition-colors ${
                      locationNote === loc
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {loc}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              placeholder="Catatan tambahan (misal: nafsu makan baik, gigi tumbuh)"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Ukuran Baru</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
