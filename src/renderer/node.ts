import Timestamp from "./timestamp";

export enum NodeType {
  Text = 'text',
  Image = 'image',
  Anchor = 'anchor',
  Directory = 'directory',
  Page = 'page', // display-only
  Code = 'code',
  Math = 'math',
  Heading = 'heading',
  Quote = 'quote',
  Table = 'table', // not yet implemented
  Canvas = 'canvas',
}

export enum InlineNodeType {
  InlineAnchor = 'inline-anchor', // display-only
  Bold = 'bold',
  Italic = 'italic',
  Underline = 'underline',
  Strikethrough = 'strikethrough',
  Subscript = 'subscript',
  Superscript = 'superscript',
  InlineMath = 'inline-math', // display-only
  InlineCode = 'inline-code',
  FootAnchor = 'foot-anchor', // not yet implemented
  Mark = 'mark', // not yet implemented
}

export enum ItemStyle {
  Unordered = 'unordered',
  Ordered = 'ordered',
  // Checkbox = 'checkbox',
}

export interface Node {
  type: NodeType;
  id: string;
  created?: Timestamp;
  modified?: Timestamp;
  createdBy?: string;
  modifiedBy?: string;
  tags?: string[];
  children: Node[];
  list?: ItemStyle;

  parent?: Node; // memoization
  index?: number; // memoization
  depth?: number; // memoization
}

// File nodes

export interface DirectoryNode extends Node {
  type: NodeType.Directory;
  name: string | undefined;
}

export interface PageNode extends Node {
  type: NodeType.Page;
  name: string | undefined;
}

// Block nodes

export interface TextNode extends Node {
  type: NodeType.Text;
  content: (InlineNode | string)[];
}

export interface ImageNode extends Node {
  type: NodeType.Image;
  fileID: string;
  // description?: string;
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

export interface CodeNode extends Node {
  type: NodeType.Code;
  fileID?: string;
  content?: string;
  language?: string;
  // description?: string;
}

export interface MathNode extends Node {
  type: NodeType.Math;
  expression: string;
}

export interface HeadingNode extends Node {
  type: NodeType.Heading;
  content: (InlineNode | string)[];
}

export interface QuoteNode extends Node {
  type: NodeType.Quote;
  content: (InlineNode | string)[];
}

export interface TableNode extends Node {
  type: NodeType.Table;
  // TODO
}

export interface CanvasNode extends Node {
  type: NodeType.Canvas;
  fileID: string;
  previewFileID: string;
}

// Inline nodes

export interface InlineNode {
  type: InlineNodeType;
  children: (InlineNode | string)[];
}

export interface InlineAnchor extends InlineNode {
  type: InlineNodeType.InlineAnchor;
  contentURL: string;
}

export interface Bold extends InlineNode {
  type: InlineNodeType.InlineAnchor;
}

export interface Italic extends InlineNode {
  type: InlineNodeType.Italic;
}

export interface Underline extends InlineNode {
  type: InlineNodeType.Underline;
}

export interface Strikethrough extends InlineNode {
  type: InlineNodeType.Strikethrough;
}

export interface Subscript extends InlineNode {
  type: InlineNodeType.Subscript;
}

export interface Superscript extends InlineNode {
  type: InlineNodeType.Superscript;
}

export interface InlineMath extends InlineNode {
  type: InlineNodeType.InlineMath;
}

export interface InlineCode extends InlineNode {
  type: InlineNodeType.InlineCode;
}

export interface FootAnchor extends InlineNode {
  type: InlineNodeType.FootAnchor;
  // TODO
}

export interface Mark extends InlineNode {
  type: InlineNodeType.Mark;
  // TODO
}

// Misc

export interface File {
  id: string;
  type: string;
  name?: string;
  url?: string;
  created?: Timestamp;
  modified?: Timestamp;
  accessed?: Timestamp;
}

export interface Tag {
  id: string;
  name: string;
  // If color == undefined, it means 'inherited'
  color?: string;
}

export interface Instance {
  id: string;
  hostname: string;
  username: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export namespace ReservedID {
  export const Root = 'root';
  export const Master = 'master';
  export const Trash = 'trash';
}