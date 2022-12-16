import Timestamp from "./timestamp";

export enum NodeType {
  Text = 'text',
  Image = 'image',
  Anchor = 'anchor',
  Directory = 'directory',
  TextEmbed = 'text-embed',
  Math = 'math',
}

export interface Node {
  type: NodeType;
  id: string;
  created?: Timestamp;
  modified?: Timestamp;
  tags?: string[];
  children: Node[];

  parent?: Node; // memoization
  index?: number; // memoization
  depth?: number; // memoization
}

/*
export interface RootNode extends Node {
  type: undefined;
}
*/

export interface TextNode extends Node {
  type: NodeType.Text;
  content: string;
}

export interface ImageNode extends Node {
  type: NodeType.Image;
  fileID: string;
  description?: string;
}

export interface AnchorNode extends Node {
  type: NodeType.Anchor;
  contentURL: string;
  contentType: string;
  contentTitle?: string;
  contentDescription?: string;
  contentImageFileID?: string;
  contentModified?: Timestamp;
  contentAccessed: Timestamp;
}

export interface DirectoryNode extends Node {
  type: NodeType.Directory;
  name: string | undefined;
}

export interface TextEmbedNode extends Node {
  type: NodeType.TextEmbed;
  fileID: string;
  description?: string;
}

export interface MathNode extends Node {
  type: NodeType.Math;
  expression: string;
}

export interface File {
  id: string;
  type: string;
  name?: string;
  url?: string;
  modified?: Timestamp;
  accessed: Timestamp;
}

export interface Tag {
  id: string;
  name: string;
}

export namespace ReservedID {
  export const Master = 'master';
  export const Trash = 'trash';
}