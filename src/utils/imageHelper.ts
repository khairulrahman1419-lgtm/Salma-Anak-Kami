import type { MomentItem, MomentMediaSlide } from '../types/index.ts';

export const MAX_EXTRA_FAMILY_PHOTOS = 8;
export const MAX_MOMENT_MEDIA_ITEMS = 10;

/**
 * Mengambil seluruh daftar slide foto/video pada satu Momen.
 * Kompatibel penuh dengan momen lama yang hanya memiliki 1 `mediaUrl`.
 */
export function getMomentMediaSlides(moment: MomentItem): MomentMediaSlide[] {
  if (Array.isArray(moment.mediaItems) && moment.mediaItems.length > 0) {
    const valid = moment.mediaItems.filter((item) => Boolean(item?.url));
    if (valid.length > 0) {
      return valid.slice(0, MAX_MOMENT_MEDIA_ITEMS);
    }
  }
  return [
    {
      id: `${moment.id}_slide_0`,
      url: moment.mediaUrl,
      mediaType: moment.mediaType === 'video' ? 'video' : 'image',
    },
  ];
}

/**
 * Membaca file gambar menjadi Data URL JPEG terkompresi ringan
 * dengan tetap mempertahankan proporsi asli (tanpa memotong rasio potret/lanskap)
 * agar ketika dibuka penuh ("foto utuhnya") tetap tajam dan utuh.
 */
export function readImageAsDataUrl(file: File, maxDim = 1280, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca foto'));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onerror = () => resolve(reader.result as string);
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(reader.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch {
            resolve(reader.result as string);
          }
        };
        img.src = reader.result;
      } else {
        reject(new Error('Hasil pembacaan foto kosong'));
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Menghasilkan URL poster frame gambar (thumbnail) dari video Cloudinary
 * sehingga video tidak pernah tampil sebagai kotak hitam kosong sebelum diputar.
 */
export function getVideoPosterUrl(videoUrl: string | undefined): string {
  if (!videoUrl) return '';
  const trimmed = videoUrl.trim();
  if (trimmed.includes('cloudinary.com') && trimmed.includes('/video/upload/')) {
    if (trimmed.includes('/so_')) {
      return trimmed.replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg$2');
    }
    return trimmed
      .replace(/\/video\/upload\//, '/video/upload/so_0,f_jpg/')
      .replace(/\.(mp4|mov|webm|mkv|avi|m4v)(\?.*)?$/i, '.jpg$2');
  }
  return '';
}

/**
 * Menghasilkan URL streaming video yang dioptimalkan dengan f_auto,q_auto dari Cloudinary
 * agar kompatibel dan lancar di semua browser (iOS Safari, Android Chrome, Desktop).
 */
export function getVideoStreamingUrl(videoUrl: string | undefined): string {
  if (!videoUrl) return '';
  const trimmed = videoUrl.trim();
  if (trimmed.includes('cloudinary.com') && trimmed.includes('/video/upload/')) {
    if (!trimmed.includes('/f_auto')) {
      return trimmed.replace(/\/video\/upload\//, '/video/upload/f_auto,q_auto/');
    }
  }
  return trimmed;
}
