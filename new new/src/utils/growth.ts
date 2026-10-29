import type { ChildProfile, FilterOptions, Gender, GrowthRecord, MomentCategory, MomentItem } from '../types/index.ts';

export interface AgeCalculation {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  label: string;
  compactLabel: string;
}

/**
 * Calculates accurate chronological age between birthDate and a given date (defaults to today).
 */
export function calculateAge(birthDateStr: string, asOfDateStr?: string): AgeCalculation {
  const birth = new Date(birthDateStr);
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();

  if (isNaN(birth.getTime()) || isNaN(asOf.getTime())) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      label: '0 Bulan',
      compactLabel: '0 bln',
    };
  }

  let years = asOf.getFullYear() - birth.getFullYear();
  let months = asOf.getMonth() - birth.getMonth();
  let days = asOf.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    // Days in previous month
    const prevMonthLastDay = new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Handle case where asOf is before birthDate
  if (years < 0 || (years === 0 && months < 0)) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      label: '0 Bulan',
      compactLabel: '0 bln',
    };
  }

  const totalMonths = years * 12 + months;

  let label = '';
  let compactLabel = '';

  if (years === 0) {
    if (months === 0) {
      label = `${days} Hari`;
      compactLabel = `${days} hr`;
    } else if (days === 0) {
      label = `${months} Bulan`;
      compactLabel = `${months} bln`;
    } else {
      label = `${months} Bulan ${days} Hari`;
      compactLabel = `${months} bln`;
    }
  } else {
    if (months === 0) {
      label = `${years} Tahun (${totalMonths} Bulan)`;
      compactLabel = `${years} thn`;
    } else {
      label = `${years} Tahun ${months} Bulan (${totalMonths} Bulan)`;
      compactLabel = `${years} thn ${months} bln`;
    }
  }

  return {
    years,
    months,
    days,
    totalMonths,
    label,
    compactLabel,
  };
}

export function formatWeight(kg?: number | null): string {
  if (kg === undefined || kg === null || isNaN(kg)) return '-';
  const rounded = (Math.round((kg + Number.EPSILON) * 10) / 10).toFixed(1);
  return `${rounded} kg`;
}

export function formatHeight(cm?: number | null): string {
  if (cm === undefined || cm === null || isNaN(cm)) return '-';
  const rounded = (Math.round((cm + Number.EPSILON) * 10) / 10).toFixed(1);
  return `${rounded} cm`;
}

export function formatHeadCirc(cm?: number | null): string {
  if (cm === undefined || cm === null || isNaN(cm)) return '-';
  const rounded = (Math.round((cm + Number.EPSILON) * 10) / 10).toFixed(1);
  return `${rounded} cm`;
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export interface LatestMeasurements {
  date: string;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm?: number;
  prevWeightKg?: number;
  prevHeightCm?: number;
  weightDiffKg?: number;
  heightDiffCm?: number;
  ageAtRecordMonths: number;
}

/**
 * Derives the most recent and second-most recent measurements from moments and growth records.
 */
export function getLatestMeasurements(
  profile: ChildProfile,
  moments: MomentItem[],
  customRecords: GrowthRecord[] = []
): LatestMeasurements {
  // Aggregate all records that have weight or height
  const allRecords: {
    date: string;
    weightKg?: number;
    heightCm?: number;
    headCirc?: number;
  }[] = [];

  // Birth stats
  allRecords.push({
    date: profile.birthDate,
    weightKg: profile.birthWeightKg,
    heightCm: profile.birthHeightCm,
    headCirc: profile.birthHeadCircumferenceCm,
  });

  // Custom growth records
  for (const r of customRecords) {
    allRecords.push({
      date: r.date,
      weightKg: r.weightKg,
      heightCm: r.heightCm,
      headCirc: r.headCircumferenceCm,
    });
  }

  // Moments with measurements
  for (const m of moments) {
    if (m.weightKg || m.heightCm || m.headCircumferenceCm) {
      allRecords.push({
        date: m.date,
        weightKg: m.weightKg,
        heightCm: m.heightCm,
        headCirc: m.headCircumferenceCm,
      });
    }
  }

  // Sort by date ascending
  allRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Find latest valid weight & height
  const weights = allRecords.filter((r) => r.weightKg !== undefined && r.weightKg > 0);
  const heights = allRecords.filter((r) => r.heightCm !== undefined && r.heightCm > 0);
  const heads = allRecords.filter((r) => r.headCirc !== undefined && r.headCirc > 0);

  const latestWeightObj = weights[weights.length - 1];
  const prevWeightObj = weights.length > 1 ? weights[weights.length - 2] : undefined;

  const latestHeightObj = heights[heights.length - 1];
  const prevHeightObj = heights.length > 1 ? heights[heights.length - 2] : undefined;

  const latestHeadObj = heads.length > 0 ? heads[heads.length - 1] : undefined;

  const latestDate = latestWeightObj?.date || latestHeightObj?.date || profile.birthDate;
  const ageAtRecord = calculateAge(profile.birthDate, latestDate).totalMonths;

  const currentWeight = latestWeightObj?.weightKg ?? profile.birthWeightKg;
  const prevWeight = prevWeightObj?.weightKg;
  const weightDiff = prevWeight !== undefined ? Number((currentWeight - prevWeight).toFixed(2)) : undefined;

  const currentHeight = latestHeightObj?.heightCm ?? profile.birthHeightCm;
  const prevHeight = prevHeightObj?.heightCm;
  const heightDiff = prevHeight !== undefined ? Number((currentHeight - prevHeight).toFixed(1)) : undefined;

  return {
    date: latestDate,
    weightKg: currentWeight,
    heightCm: currentHeight,
    headCircumferenceCm: latestHeadObj?.headCirc ?? profile.birthHeadCircumferenceCm,
    prevWeightKg: prevWeight,
    prevHeightCm: prevHeight,
    weightDiffKg: weightDiff,
    heightDiffCm: heightDiff,
    ageAtRecordMonths: ageAtRecord,
  };
}

/**
 * Filter moments by category, age range, media type, and search keyword.
 */
export function filterMoments(
  moments: MomentItem[],
  filter: FilterOptions,
  birthDateStr: string
): MomentItem[] {
  return moments.filter((m) => {
    // 1. Category filter
    if (filter.category !== 'all' && m.category !== filter.category) {
      return false;
    }

    // 2. Media Type filter
    if (filter.mediaType !== 'all' && m.mediaType !== filter.mediaType) {
      return false;
    }

    // 3. Age range filter
    if (filter.ageRange !== 'all') {
      const ageMonths = calculateAge(birthDateStr, m.date).totalMonths;
      if (filter.ageRange === '0-6' && (ageMonths < 0 || ageMonths > 6)) return false;
      if (filter.ageRange === '6-12' && (ageMonths < 6 || ageMonths > 12)) return false;
      if (filter.ageRange === '12-24' && (ageMonths < 12 || ageMonths > 24)) return false;
      if (filter.ageRange === '24+' && ageMonths < 24) return false;
    }

    // 4. Text Search filter
    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchNotes = m.notes.toLowerCase().includes(q);
      const matchCategory = m.category.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchCategory) {
        return false;
      }
    }

    return true;
  });
}

export const CATEGORY_LABELS: Record<MomentCategory, { label: string; icon: string; color: string }> = {
  milestone_fisik: { label: 'Milestone Fisik', icon: 'Footprints', color: 'text-emerald-700 bg-emerald-50' },
  kata_pertama: { label: 'Kata & Bahasa', icon: 'MessageCircle', color: 'text-sky-700 bg-sky-50' },
  momen_lucu: { label: 'Momen Lucu', icon: 'Smile', color: 'text-amber-700 bg-amber-50' },
  bermain: { label: 'Aktivitas Bermain', icon: 'Sparkles', color: 'text-indigo-700 bg-indigo-50' },
  makan_mpasi: { label: 'MPASI & Nutrisi', icon: 'Utensils', color: 'text-orange-700 bg-orange-50' },
  kesehatan: { label: 'Kesehatan & Imunisasi', icon: 'ShieldAlert', color: 'text-rose-700 bg-rose-50' },
  ulang_tahun: { label: 'Ulang Tahun', icon: 'Cake', color: 'text-purple-700 bg-purple-50' },
  lainnya: { label: 'Momen Spesial', icon: 'Heart', color: 'text-slate-700 bg-slate-100' },
};

/**
 * Standard WHO Child Growth Standard percentiles (Weight-for-age, 0-24 months for Boys).
 * Interpolated from WHO growth standard tables.
 */
export const WHO_WEIGHT_BOYS = [
  { month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { month: 2, p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
  { month: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7 },
  { month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
  { month: 9, p3: 7.2, p15: 8.0, p50: 8.9, p85: 9.9, p97: 11.0 },
  { month: 12, p3: 7.8, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
  { month: 15, p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.8 },
  { month: 18, p3: 8.8, p15: 9.7, p50: 10.9, p85: 12.2, p97: 13.7 },
  { month: 21, p3: 9.2, p15: 10.2, p50: 11.5, p85: 12.9, p97: 14.5 },
  { month: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 },
  { month: 30, p3: 10.5, p15: 11.8, p50: 13.3, p85: 15.0, p97: 16.9 },
  { month: 36, p3: 11.3, p15: 12.7, p50: 14.3, p85: 16.2, p97: 18.3 },
];

/**
 * Standard WHO Child Growth Standard percentiles (Height-for-age, 0-24 months for Boys).
 */
export const WHO_HEIGHT_BOYS = [
  { month: 0, p3: 46.1, p15: 48.0, p50: 49.9, p85: 51.8, p97: 53.7 },
  { month: 2, p3: 54.4, p15: 56.4, p50: 58.4, p85: 60.4, p97: 62.4 },
  { month: 4, p3: 60.0, p15: 61.9, p50: 63.9, p85: 65.9, p97: 67.8 },
  { month: 6, p3: 63.6, p15: 65.5, p50: 67.6, p85: 69.7, p97: 71.6 },
  { month: 9, p3: 67.7, p15: 69.7, p50: 72.0, p85: 74.2, p97: 76.2 },
  { month: 12, p3: 71.0, p15: 73.4, p50: 75.7, p85: 78.1, p97: 80.5 },
  { month: 15, p3: 74.1, p15: 76.6, p50: 79.1, p85: 81.7, p97: 84.2 },
  { month: 18, p3: 76.9, p15: 79.6, p50: 82.3, p85: 85.0, p97: 87.7 },
  { month: 21, p3: 79.4, p15: 82.3, p50: 85.1, p85: 88.0, p97: 90.9 },
  { month: 24, p3: 81.7, p15: 84.8, p50: 87.8, p85: 90.9, p97: 93.9 },
  { month: 30, p3: 86.0, p15: 89.2, p50: 92.4, p85: 95.7, p97: 98.9 },
  { month: 36, p3: 89.9, p15: 93.2, p50: 96.5, p85: 99.8, p97: 103.1 },
];

export function getWHOGrowthStatus(ageMonths: number, weightKg: number): {
  status: 'ideal' | 'perhatian' | 'pantau';
  label: string;
  badgeClass: string;
} {
  // Find nearest WHO bracket
  const bracket = WHO_WEIGHT_BOYS.reduce((prev, curr) =>
    Math.abs(curr.month - ageMonths) < Math.abs(prev.month - ageMonths) ? curr : prev
  );

  if (weightKg >= bracket.p15 && weightKg <= bracket.p85) {
    return {
      status: 'ideal',
      label: 'Sesuai Kurva WHO (Normal)',
      badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    };
  } else if (weightKg >= bracket.p3 && weightKg <= bracket.p97) {
    return {
      status: 'pantau',
      label: 'Batas Normal WHO',
      badgeClass: 'text-amber-700 bg-amber-50 border border-amber-200',
    };
  } else {
    return {
      status: 'perhatian',
      label: 'Perlu Konsultasi Dokter Anak',
      badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200',
    };
  }
}
