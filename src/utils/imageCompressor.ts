/**
 * Utility to compress images client-side before saving to database/localStorage.
 * Limits original file size to prevent memory lag, resizes dimensions to max 800x800,
 * and compresses to JPEG ~0.8 quality (~40KB to ~80KB final size).
 */

export interface CompressionResult {
  dataUrl: string;
  sizeKb: number;
  originalSizeMb: number;
  width: number;
  height: number;
}

export const MAX_UPLOAD_SIZE_MB = 5; // 5 Megabytes original limit

export const compressImageFile = (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    const originalSizeMb = file.size / (1024 * 1024);

    if (originalSizeMb > MAX_UPLOAD_SIZE_MB) {
      reject(
        new Error(
          `Arquivo de ${originalSizeMb.toFixed(1)}MB excede o limite máximo permitido de ${MAX_UPLOAD_SIZE_MB}MB.`
        )
      );
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('Formato de arquivo inválido. Envie uma imagem (JPG, PNG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Erro ao processar imagem para compressão.'));
      img.onload = () => {
        let { width, height } = img;

        // Scale down proportionally if larger than maxWidth/maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha no contexto gráfico do navegador.'));
          return;
        }

        // Draw and compress to jpeg
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Estimate size in KB from base64 length
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const sizeKb = Math.round((base64Length * 3) / 4 / 1024);

        resolve({
          dataUrl,
          sizeKb,
          originalSizeMb,
          width,
          height,
        });
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };

    reader.readAsDataURL(file);
  });
};
