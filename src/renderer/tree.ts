import Model, { DateView, DirectoryNode, DirectoryView, Node, NodeType, PseudoDirectoryNode, PseudoNode, ReservedID, TagView, ViewType } from './model';

export interface Depth {
  depth: number;
}

export type NestedNodeArray = (((Node | PseudoNode) & Depth) | NestedNodeArray)[];

export function createTree(model: Model, parentID: string | undefined, filter = (node: Node) => true, depth = 0): NestedNodeArray {
  let node = model.getNode(parentID) as (Node | PseudoDirectoryNode) & Depth;
  node = { ...node, depth };
  const children: NestedNodeArray = [];

  for (const child of model.getChildNodes(parentID)) {
    if (filter(child)) {
      children.push(createTree(model, child.id, filter, depth + 1));
    }
  }

  return [node, children];
}

export function createTreeFromArray(model: Model, nodes: Node[], depth = 0): NestedNodeArray {
  const children: NestedNodeArray = [];

  for (const child of nodes) {
    children.push(createTree(model, child.id, () => true, depth + 1));
  }

  return children;
}

export function flatten(array: NestedNodeArray) {
  // Temporal fix for "Type instantiation is excessively deep and possibly infinite."
  return (array as any[]).flat(Infinity) as ((Node | PseudoNode) & Depth)[];
}