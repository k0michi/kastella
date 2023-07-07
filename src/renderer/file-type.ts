export enum ImageFileType {
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  GIF = 'image/gif',
  WebP = 'image/webp',
}

export enum TextFileType {
  Plain = 'text/plain',
}

export function isSupportedImageFileType(mimeType: string | null) {
  return mimeType === ImageFileType.PNG 
    || mimeType === ImageFileType.JPEG
    || mimeType === ImageFileType.GIF
    || mimeType === ImageFileType.WebP;
}

export function isSupportedTextFileType(mimeType: string | null) {
  return mimeType === TextFileType.Plain;
}