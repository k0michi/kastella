import Model, { DateView, DirectoryNode, DirectoryView, Node, NodeType, ReservedID, TagView, ViewType } from './model';

export interface Depth {
  depth: number;
}

export function* visit(node: Node[] | Node, filter = (node: Node) => true): Generator<Node> {
  let children;

  if (!Array.isArray(node)) {
    children = node.children;

    if (filter(node)) {
      yield node;
    }
  } else {
    children = node;
  }

  for (const child of children) {
    if (filter(child)) {
      yield* visit(child, filter);
    }
  }
}

export function isDirectory(node: Node) {
  return node.type == NodeType.Directory;
}