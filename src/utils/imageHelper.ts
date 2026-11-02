export const MAX_EXTRA_FAMILY_PHOTOS = 8;

/**
 * Membaca file gambar menjadi Data URL JPEG terkompresi ringan
 * dengan tetap mempertahankan proporsi asli (tanpa memotong rasio potret/lanskap)
 * agar ketika dibuka penuh ("foto utuhnya") tetap tajam dan utuh.
 */
export function readImageAsDataUrl(file: File, maxDim = 1280): Promise<string> {
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
            resolve(canvas.toDataURL('image/jpeg', 0.84));
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
