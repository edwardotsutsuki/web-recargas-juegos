/**
/**
 * Utilidad de compresión de comprobantes de pago (Vouchers) en el navegador.
 * Reduce fotos de smartphones (2MB - 5MB) a formato WebP optimizado (~30KB - 50KB)
 * manteniendo la legibilidad cristalina del número de comprobante, fecha y valor.
 */
export async function compressVoucherImage(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.72
): Promise<{ dataUrl: string; originalSizeBytes: number; compressedSizeBytes: number; compressionRatio: string }> {
  const originalSizeBytes = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantener proporción de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo inicializar el contexto de imagen 2D.'));
        }

        // Suavizado bicúbico de alta calidad para preservar dígitos pequeños
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Intentar compresión a WebP (soportado por todos los navegadores modernos)
        let compressedDataUrl = canvas.toDataURL('image/webp', quality);

        // Fallback a JPEG si WebP no fue soportado
        if (!compressedDataUrl.startsWith('data:image/webp')) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Calcular tamaño aproximado del base64 comprimido
        const base64Str = compressedDataUrl.substring(compressedDataUrl.indexOf(',') + 1);
        const compressedSizeBytes = Math.round((base64Str.length * 3) / 4);

        const ratio = (((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100).toFixed(1);

        resolve({
          dataUrl: compressedDataUrl,
          originalSizeBytes,
          compressedSizeBytes,
          compressionRatio: `${ratio}%`,
        });
      };

      img.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo del dispositivo.'));
    reader.readAsDataURL(file);
  });
}
