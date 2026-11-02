import type {
  ChildProfile,
  GrowthRecord,
  MilestoneChecklistItem,
  MomentItem,
  ParentingQuoteItem,
} from '../types/index.ts';

export const INITIAL_CHILD_PROFILE: ChildProfile = {
  id: 'child_salma_01',
  name: 'Salma Nur Khalisa',
  nickname: 'Salma',
  birthDate: '2026-03-25',
  gender: 'female',
  bloodType: 'A+',
  avatarUrl: '/src/assets/images/moment_first_steps_1792502523399.jpg',
  fatherName: 'Ayah Rahman',
  fatherInfo: 'Ayah Siaga',
  fatherAvatarUrl: '/src/assets/images/moment_father_play_1792555577232.jpg',
  motherName: 'Bunda',
  motherInfo: 'ASI & MPASI Bernutrisi',
  motherAvatarUrl: '/src/assets/images/moment_eating_puree_1792555107552.jpg',
  birthWeightKg: 3.3,
  birthHeightCm: 49.5,
  birthHeadCircumferenceCm: 34.5,
  specialNotes:
    'Buah hati tercinta Ayah Rahman & Ibu. ASI eksklusif dilanjutkan MPASI bernutrisi.',
};

export const INITIAL_MOMENTS: MomentItem[] = [];

export const INITIAL_GROWTH_RECORDS: GrowthRecord[] = [
  {
    id: 'gr_birth_salma',
    date: '2026-03-25',
    ageMonths: 0,
    weightKg: 3.3,
    heightCm: 49.5,
    headCircumferenceCm: 34.5,
    notes: 'Data Kelahiran Salma Nur Khalisa',
  },
];

export const INITIAL_MILESTONES: MilestoneChecklistItem[] = [
  {
    id: 'ms_1',
    domain: 'sosial',
    ageRangeLabel: '0 - 3 Bulan',
    minAgeMonths: 0,
    maxAgeMonths: 3,
    title: 'Tersenyum Sosial Membalas Sapaan',
    description: 'Tersenyum spontan ketika diajak bicara atau ditatap lembut oleh Ayah & Bunda.',
    completed: false,
  },
  {
    id: 'ms_2',
    domain: 'motorik_kasar',
    ageRangeLabel: '3 - 6 Bulan',
    minAgeMonths: 3,
    maxAgeMonths: 6,
    title: 'Tengkurap & Mengangkat Kepala Tegak',
    description: 'Mampu berguling ke posisi tengkurap dan menahan kepala serta dada dengan bertumpu lengan.',
    completed: false,
  },
  {
    id: 'ms_3',
    domain: 'motorik_halus',
    ageRangeLabel: '4 - 6 Bulan',
    minAgeMonths: 4,
    maxAgeMonths: 6,
    title: 'Meraih & Menggenggam Mainan',
    description: 'Koordinasi mata dan tangan mulai terarah untuk meraih benda berwarna cerah.',
    completed: false,
  },
  {
    id: 'ms_4',
    domain: 'motorik_kasar',
    ageRangeLabel: '6 - 9 Bulan',
    minAgeMonths: 6,
    maxAgeMonths: 9,
    title: 'Duduk Mandiri Tanpa Sandaran',
    description: 'Dapat duduk seimbang sambil memainkan benda dengan kedua tangan.',
    completed: false,
  },
  {
    id: 'ms_5',
    domain: 'bahasa',
    ageRangeLabel: '6 - 12 Bulan',
    minAgeMonths: 6,
    maxAgeMonths: 12,
    title: 'Mengoceh Suku Kata (Ma-ma / Pa-pa)',
    description: 'Meniru suara percakapan dan menoleh saat namanya dipanggil.',
    completed: false,
  },
  {
    id: 'ms_6',
    domain: 'motorik_kasar',
    ageRangeLabel: '9 - 15 Bulan',
    minAgeMonths: 9,
    maxAgeMonths: 15,
    title: 'Berdiri Mandiri & Langkah Pertama',
    description: 'Belajar berdiri tanpa berpegangan lalu melangkah maju perlahan.',
    completed: false,
  },
];

export const INITIAL_PARENTING_QUOTES: ParentingQuoteItem[] = [
  {
    id: 'quote_1',
    orderIndex: 0,
    text: 'Kehadiran seorang anak adalah anugerah terindah dari Tuhan yang membawa rezeki serta kebahagiaan yang tidak ternilai harganya ke dalam rumah tangga.',
  },
  {
    id: 'quote_2',
    orderIndex: 1,
    text: 'Setiap lelah dalam mengurus dan mendidik anak bernilai ibadah di sisi-Nya, karena kesabaran orang tua adalah ladang pahala yang luar biasa.',
  },
  {
    id: 'quote_3',
    orderIndex: 2,
    text: 'Tetaplah semangat dan ikhlas dalam merawat buah hati, sebab setiap keringat dan pengorbanan hari ini akan menjadi investasi kebaikan di masa depan.',
  },
  {
    id: 'quote_4',
    orderIndex: 3,
    text: 'Menemani tumbuh kembang anak dengan penuh cinta kasih bukan sekadar tugas, melainkan bentuk syukur atas amanah mulia yang dipercayakan kepada kita.',
  },
  {
    id: 'quote_5',
    orderIndex: 4,
    text: 'Pelukan hangat dan senyuman anak di tengah penatnya hari adalah pengingat bahwa Allah telah menitipkan surga kecil di dalam keluarga kita.',
  },
  {
    id: 'quote_6',
    orderIndex: 5,
    text: 'Jadikan setiap detik membersamai anak sebagai momen berharga untuk menanamkan kebaikan sekaligus mendekatkan diri kepada Sang Pencipta.',
  },
  {
    id: 'quote_7',
    orderIndex: 6,
    text: 'Tidak ada usaha mendidik anak yang sia-sia; setiap doa dan didikan tulus adalah bentuk ketaatan serta ibadah terbaik seorang orang tua.',
  },
];
