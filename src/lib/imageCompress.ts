/** Kompres gambar di browser menjadi WebP, maksimal lebar 1200px, sebelum diunggah. */
export async function compressToWebp(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Berkas harus berupa gambar.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Browser tidak mendukung kompresi gambar.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality)
  );
  if (!blob) {
    throw new Error('Gagal mengompres gambar.');
  }

  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
}
