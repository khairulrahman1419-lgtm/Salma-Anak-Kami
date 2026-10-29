import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAge,
  formatWeight,
  formatHeight,
  getLatestMeasurements,
  filterMoments,
  getWHOGrowthStatus,
} from './growth.ts';
import type { ChildProfile, MomentItem } from '../types/index.ts';

const mockProfile: ChildProfile = {
  id: 'child_1',
  name: 'Kalandra Arka',
  nickname: 'Kalandra',
  birthDate: '2025-06-15',
  gender: 'male',
  avatarUrl: '/avatar.jpg',
  fatherName: 'Ayah Dimas',
  birthWeightKg: 3.2,
  birthHeightCm: 49.0,
  birthHeadCircumferenceCm: 34.0,
};

const mockMoments: MomentItem[] = [
  {
    id: 'm1',
    title: 'Langkah Pertama',
    date: '2026-05-15', // 11 months
    mediaType: 'image',
    mediaUrl: '/step.jpg',
    category: 'milestone_fisik',
    notes: 'Kalandra bisa melangkah 3 langkah pertama tanpa pegangan!',
    weightKg: 9.4,
    heightCm: 76.5,
    googleDriveSynced: true,
    createdAt: '2026-05-15T10:00:00Z',
  },
  {
    id: 'm2',
    title: 'Bicara Kata Pertama',
    date: '2026-08-15', // 14 months
    mediaType: 'video',
    mediaUrl: '/talk.mp4',
    category: 'kata_pertama',
    notes: 'Mengucapkan kata "Papa" dengan jelas sambil tersenyum lebar.',
    weightKg: 10.1,
    heightCm: 80.0,
    googleDriveSynced: true,
    createdAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'm3',
    title: 'Bermain di Taman Kota',
    date: '2026-10-15', // 16 months
    mediaType: 'image',
    mediaUrl: '/park.jpg',
    category: 'bermain',
    notes: 'Mengejar gelembung sabun bersama Ayah sore hari.',
    weightKg: 10.5,
    heightCm: 81.5,
    googleDriveSynced: false,
    createdAt: '2026-10-15T10:00:00Z',
  },
];

test('calculateAge returns accurate years, months, and Indonesian text label', () => {
  const age1 = calculateAge('2025-06-15', '2026-10-15');
  assert.equal(age1.years, 1);
  assert.equal(age1.months, 4);
  assert.equal(age1.totalMonths, 16);
  assert.ok(age1.label.includes('1 Tahun 4 Bulan'));

  const ageInfant = calculateAge('2026-06-15', '2026-09-15');
  assert.equal(ageInfant.years, 0);
  assert.equal(ageInfant.months, 3);
  assert.equal(ageInfant.totalMonths, 3);
  assert.equal(ageInfant.label, '3 Bulan');
});

test('formatting functions handle numbers and fallbacks cleanly', () => {
  assert.equal(formatWeight(10.45), '10.5 kg');
  assert.equal(formatWeight(null), '-');
  assert.equal(formatHeight(81.2), '81.2 cm');
  assert.equal(formatHeight(undefined), '-');
});

test('getLatestMeasurements computes latest stats and positive delta', () => {
  const latest = getLatestMeasurements(mockProfile, mockMoments);
  assert.equal(latest.weightKg, 10.5);
  assert.equal(latest.heightCm, 81.5);
  assert.equal(latest.prevWeightKg, 10.1);
  assert.equal(latest.prevHeightCm, 80.0);
  assert.equal(latest.weightDiffKg, 0.4);
  assert.equal(latest.heightDiffCm, 1.5);
  assert.equal(latest.date, '2026-10-15');
});

test('filterMoments filters accurately by category, age range, media type, and query', () => {
  // Category filter
  const physicalOnly = filterMoments(
    mockMoments,
    { category: 'milestone_fisik', ageRange: 'all', mediaType: 'all', searchQuery: '' },
    mockProfile.birthDate
  );
  assert.equal(physicalOnly.length, 1);
  assert.equal(physicalOnly[0].title, 'Langkah Pertama');

  // Media type filter
  const videoOnly = filterMoments(
    mockMoments,
    { category: 'all', ageRange: 'all', mediaType: 'video', searchQuery: '' },
    mockProfile.birthDate
  );
  assert.equal(videoOnly.length, 1);
  assert.equal(videoOnly[0].title, 'Bicara Kata Pertama');

  // Age bracket filter: 12-24 months
  const toddlerAge = filterMoments(
    mockMoments,
    { category: 'all', ageRange: '12-24', mediaType: 'all', searchQuery: '' },
    mockProfile.birthDate
  );
  assert.equal(toddlerAge.length, 2);

  // Search keyword query
  const searched = filterMoments(
    mockMoments,
    { category: 'all', ageRange: 'all', mediaType: 'all', searchQuery: 'gelembung' },
    mockProfile.birthDate
  );
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 'm3');
});

test('getWHOGrowthStatus evaluates normal growth range properly', () => {
  const status16Months = getWHOGrowthStatus(16, 10.5);
  assert.equal(status16Months.status, 'ideal');
  assert.ok(status16Months.label.includes('Normal'));
});
