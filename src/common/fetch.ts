export interface FetchedMeta {
  url: string;
  type: string;
  title?: string;
  description?: string;
  imageURL?: string;
  modified?: string;
}

export interface FetchedFile {
  url: string;
  type: string;
  modified?: string;
  data: Uint8Array;
}

export enum FileType {
  Text,
  Image
}