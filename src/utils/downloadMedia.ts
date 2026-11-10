/**
 * Mengunduh file foto atau video (termasuk yang tersimpan di Cloudinary `res.cloudinary.com`)
 * secara aman di perangkat mobile maupun desktop tanpa `window.open`.
 */
export async function downloadMediaFile(
  mediaUrl: string,
  titleOrName: string,
  mediaType: 'image' | 'video' | 'photo' = 'image'
): Promise<boolean> {
  if (!mediaUrl) return false;

  const safeSlug =
    titleOrName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'momen-salma';

  const triggerAnchorDownload = (href: string, filename: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 150);
  };

  try {
    if (mediaUrl.startsWith('data:')) {
      const mimeMatch = mediaUrl.match(/^data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      let ext = mediaType === 'video' ? 'mp4' : 'jpg';
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('mp4')) ext = 'mp4';
      else if (mime.includes('quicktime') || mime.includes('mov')) ext = 'mov';

      triggerAnchorDownload(mediaUrl, `${safeSlug}.${ext}`);
      return true;
    }

    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error('Gagal mengambil media untuk diunduh');
    }
    const blob = await response.blob();
    let ext = mediaType === 'video' ? 'mp4' : 'jpg';
    if (blob.type.includes('png')) ext = 'png';
    else if (blob.type.includes('webp')) ext = 'webp';
    else if (blob.type.includes('mp4')) ext = 'mp4';
    else if (blob.type.includes('quicktime')) ext = 'mov';

    const objectUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(objectUrl, `${safeSlug}.${ext}`);
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 3000);
    return true;
  } catch (err) {
    console.error('Download media fallback:', err);
    try {
      const ext = mediaType === 'video' ? 'mp4' : 'jpg';
      // Untuk URL Cloudinary, tambahkan flag fl_attachment agar langsung terunduh di browser HP
      const attachmentUrl = mediaUrl.includes('res.cloudinary.com/')
        ? mediaUrl.replace('/upload/', `/upload/fl_attachment:${safeSlug}/`)
        : mediaUrl;
      triggerAnchorDownload(attachmentUrl, `${safeSlug}.${ext}`);
      return true;
    } catch {
      return false;
    }
  }
}
