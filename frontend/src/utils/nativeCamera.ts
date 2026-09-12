import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface PhotoCaptureResult {
  dataUrl: string;
  blob?: Blob;
  format?: string;
}

/**
 * Servicio unificado para captura de fotos de comprobantes bancarios.
 * Si se ejecuta en Android (Capacitor), abre la cámara nativa del celular o la galería.
 * Si se ejecuta en navegador web (PC), abre el selector nativo de archivos HTML5.
 */
export async function captureVoucherPhoto(): Promise<PhotoCaptureResult | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Solicitar permisos de cámara si fuera necesario
      const permissions = await Camera.checkPermissions();
      if (permissions.camera !== 'granted' || permissions.photos !== 'granted') {
        await Camera.requestPermissions();
      }

      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // Ofrece: Cámara o Galería de fotos
        saveToGallery: false,
        promptLabelHeader: 'Comprobante de Depósito',
        promptLabelPhoto: 'Elegir de Galería',
        promptLabelPicture: 'Tomar Foto con Cámara',
        promptLabelCancel: 'Cancelar',
      });

      if (!image.dataUrl) return null;

      // Convertir dataUrl a Blob para compatibilidad con subidas multipart/Supabase Storage
      const response = await fetch(image.dataUrl);
      const blob = await response.blob();

      return {
        dataUrl: image.dataUrl,
        blob,
        format: image.format,
      };
    } catch (err: any) {
      // El usuario canceló la selección de foto
      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
        return null;
      }
      console.warn('Fallo cámara nativa, recurriendo a selector web:', err);
    }
  }

  // Fallback web tradicional (Navegador en PC o móvil)
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.capture = 'environment'; // Sugiere cámara trasera en navegadores móviles

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: reader.result as string,
          blob: file,
          format: file.type.split('/')[1] || 'jpeg',
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

