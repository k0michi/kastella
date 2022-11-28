import Model, { DateView, DirectoryNode, DirectoryView, Node, NodeType, PseudoDirectoryNode, PseudoNode, ReservedID, TagView, ViewType } from './model';

export interface Depth {
  depth: number;
}

export type NestedNodeArray = (((Node | PseudoNode) & Depth) | NestedNodeArray)[];

export function createTree(model: Model, parentID: string | undefined, depth = 0): NestedNodeArray {
  let node = model.getNode(parentID) as (DirectoryNode | PseudoDirectoryNode) & Depth;
  node = { ...node, depth };
  const children: NestedNodeArray = [];

  for (const child of model.getChildNodes(parentID)) {
    if (child.type == NodeType.Directory) {
      children.push(createTree(model, child.id, depth + 1));
    }
  }

  return [node, children];
}

export function flatten(array: NestedNodeArray) {
  // Temporal fix for "Type instantiation is excessively deep and possibly infinite."
  return (array as any[]).flat(Infinity) as ((Node | PseudoNode) & Depth)[];
}