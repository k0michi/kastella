export enum FileType {
  PNG = 'image/png',
  JPEG = 'image/jpeg',
  GIF = 'image/gif',
  WebP = 'image/webp',
  Plain = 'text/plain',
  JSON = 'application/json',
  SVG = 'image/svg+xml',
}

export function isSupportedImageFileType(mimeType: string | null) {
  return mimeType === FileType.PNG 
    || mimeType === FileType.JPEG
    || mimeType === FileType.GIF
    || mimeType === FileType.WebP
    || mimeType === FileType.SVG;
}

export function isSupportedTextFileType(mimeType: string | null) {
  return mimeType === FileType.Plain;
}

export enum FileKind {
  Text,
  Image,
}