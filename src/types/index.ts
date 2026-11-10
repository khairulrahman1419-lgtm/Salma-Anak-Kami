export type Gender = 'male' | 'female';

export interface FamilyExtraPhoto {
  id: string;
  url: string;
  label?: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  nickname: string;
  birthDate: string; // YYYY-MM-DD
  gender: Gender;
  bloodType?: string;
  avatarUrl: string;
  fatherName: string;
  fatherInfo?: string;
  fatherAvatarUrl?: string;
  motherName?: string;
  motherInfo?: string;
  motherAvatarUrl?: string;
  extraFamilyPhotos?: FamilyExtraPhoto[];
  birthWeightKg: number;
  birthHeightCm: number;
  birthHeadCircumferenceCm?: number;
  specialNotes?: string;
}

export type MomentCategory =
  | 'milestone_fisik'
  | 'kata_pertama'
  | 'momen_lucu'
  | 'bermain'
  | 'makan_mpasi'
  | 'kesehatan'
  | 'ulang_tahun'
  | 'lainnya';

export type MediaStorageProvider = 'cloudinary' | 'firebase';

export interface MomentMediaSlide {
  id: string;
  url: string;
  mediaType: 'image' | 'video' | 'photo';
  storageProvider?: MediaStorageProvider;
}

export interface MomentItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  mediaType: 'image' | 'video' | 'photo';
  storageProvider?: MediaStorageProvider;
  mediaUrl: string;
  mediaItems?: MomentMediaSlide[];
  thumbnailUrl?: string;
  category: MomentCategory;
  notes: string;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
  googleDriveSynced: boolean;
  googleDriveFileId?: string;
  googleDriveWebViewLink?: string;
  pendingStorageUpload?: boolean;
  createdAt: string;
}

export interface GrowthRecord {
  id: string;
  date: string; // YYYY-MM-DD
  ageMonths: number;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm?: number;
  notes?: string;
  sourceMomentId?: string;
}

export interface MilestoneChecklistItem {
  id: string;
  domain: 'motorik_kasar' | 'motorik_halus' | 'bahasa' | 'kognitif' | 'sosial';
  ageRangeLabel: string;
  minAgeMonths: number;
  maxAgeMonths: number;
  title: string;
  description: string;
  completed: boolean;
  completedDate?: string;
  notes?: string;
}

export interface ParentingQuoteItem {
  id: string;
  orderIndex: number;
  text: string;
  updatedAt?: string;
}

export interface FilterOptions {
  category: string; // 'all' or MomentCategory
  ageRange: string; // 'all' | '0-6' | '6-12' | '12-24' | '24+'
  mediaType: 'all' | 'image' | 'video';
  searchQuery: string;
}
