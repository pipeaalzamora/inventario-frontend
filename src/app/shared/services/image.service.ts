import { Injectable } from '@angular/core';

export type AspectRatio = 'portrait' | 'landscape';

export class ImageConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageConversionError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly DEFAULT_MAX_SIZE_MB = 2;
  private readonly BYTES_PER_MB = 1024 * 1024;

  constructor() { }

  /**
   * Convierte un archivo File a string base64 con validación automática de tamaño
   * @param file - Archivo a convertir
   * @param maxSizeMB - Tamaño máximo en MB (default: 2MB)
   * @returns Promise con el string base64 completo (incluye prefijo data:image/...)
   * @throws ImageConversionError si el archivo excede el tamaño máximo
   */
  ConvertFileToBase64String = (file: File, maxSizeMB: number = this.DEFAULT_MAX_SIZE_MB): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validar tamaño del archivo antes de procesarlo
      const maxSizeBytes = maxSizeMB * this.BYTES_PER_MB;
      if (file.size > maxSizeBytes) {
        reject(new ImageConversionError(
          `El archivo excede el tamaño máximo de ${maxSizeMB}MB. Tamaño actual: ${(file.size / this.BYTES_PER_MB).toFixed(2)}MB`
        ));
        return;
      }

      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        reject(new ImageConversionError('El archivo debe ser una imagen válida'));
        return;
      }

      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          // Validar tamaño del base64 resultante
          const base64WithoutPrefix = this.GetBase64WithoutPrefix(result);
          if (!this.ValidateBase64Size(base64WithoutPrefix, maxSizeMB)) {
            reject(new ImageConversionError(
              `El archivo convertido excede el tamaño máximo de ${maxSizeMB}MB después de la conversión`
            ));
            return;
          }
          resolve(result);
        } else {
          reject(new ImageConversionError('Error al convertir el archivo a base64'));
        }
      };

      reader.onerror = () => {
        reject(new ImageConversionError('Error al leer el archivo'));
      };
    });
  };

  /**
   * Extrae el mimeType de un string base64
   * @param base64String - String base64 (con o sin prefijo data:)
   * @returns El tipo MIME (ej: "image/jpeg", "image/png") o null si no se puede determinar
   */
  GetMimeTypeFromBase64 = (base64String: string): string | null => {
    if (!base64String || typeof base64String !== 'string') {
      return null;
    }

    // Si tiene prefijo data:image/...;base64,
    if (base64String.startsWith('data:image/')) {
      const mimeMatch = base64String.match(/data:image\/([^;]+)/);
      if (mimeMatch && mimeMatch[1]) {
        return `image/${mimeMatch[1]}`;
      }
    }

    // Si es solo base64 sin prefijo, no podemos determinar el mimeType confiablemente
    return null;
  };

  /**
   * Valida el tamaño de un string base64 (sin el prefijo data:)
   * @param base64String - String base64 sin prefijo
   * @param maxSizeMB - Tamaño máximo en MB (default: 2MB)
   * @returns true si está dentro del límite, false si excede
   */
  ValidateBase64Size = (base64String: string, maxSizeMB: number = this.DEFAULT_MAX_SIZE_MB): boolean => {
    if (!base64String || typeof base64String !== 'string') {
      return false;
    }

    // Calcular tamaño aproximado del base64
    // Base64 aumenta el tamaño en ~33%, entonces: tamaño_real ≈ (base64_length * 3) / 4
    const base64Length = base64String.length;
    const approximateSizeBytes = (base64Length * 3) / 4;
    const maxSizeBytes = maxSizeMB * this.BYTES_PER_MB;

    return approximateSizeBytes <= maxSizeBytes;
  };

  /**
   * Remueve el prefijo data:image/...;base64, del string base64
   * @param base64String - String base64 completo con prefijo
   * @returns String base64 sin el prefijo data:
   */
  GetBase64WithoutPrefix = (base64String: string): string => {
    if (!base64String || typeof base64String !== 'string') {
      return '';
    }

    // Si tiene el prefijo data:, removerlo
    if (base64String.includes(',')) {
      return base64String.split(',')[1];
    }

    // Si no tiene prefijo, retornar tal cual
    return base64String;
  };

  /**
   * Obtiene la orientación (aspect ratio) de una imagen desde un data URL
   * @param dataUrl - Data URL de la imagen
   * @returns Promise con el aspect ratio ('portrait' o 'landscape')
   */
  GetAspectRatioFromDataUrl = (dataUrl: string): Promise<AspectRatio> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        let aspect: AspectRatio = 'portrait';

        if (img.height < img.width) {
          aspect = 'landscape';
        }

        resolve(aspect);
      };

      img.onerror = () => {
        // Por defecto retornar landscape en caso de error
        resolve('landscape');
      };

      img.src = dataUrl;
    });
  };

  /**
   * Convierte un buffer a File (método utilitario existente)
   * @param buffer - Buffer de datos
   * @returns Promise con el File creado
   */
  async GetFileFromBuffer(buffer: string): Promise<File | undefined> {
    try {
      const imgData = new Blob([buffer], { type: 'application/octet-binary' });
      const link = URL.createObjectURL(imgData);

      return new File([imgData], link, {
        type: imgData.type
      });
    } catch (error) {
      console.error('Error al convertir buffer a File:', error);
      return undefined;
    }
  }

  /**
   * Obtiene un File desde una URL (método utilitario existente)
   * @param url - URL de la imagen
   * @returns Promise con el File creado
   */
  async GetFileFromUrl(url: string): Promise<File | undefined> {
    try {
      const fileName = url.split('/').reverse()[0];
      const blob = new Blob([url], { type: 'application/octet-stream' });

      return new File([blob], fileName, {
        type: blob.type
      });
    } catch (error) {
      console.error('Error al convertir URL a File:', error);
      return undefined;
    }
  }
}
