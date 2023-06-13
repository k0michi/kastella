import { v4 as uuidv4 } from 'uuid';
import { DirectoryNode, NodeType, ReservedID } from './node';
import { visit } from './tree';

export namespace Version5 {
  export function findNode(nodes: any, id: string | undefined) {
    return nodes.find((n: any) => n.id == id);
  }
  export function getChildNodes(nodes: any, parentID: string | undefined) {
    return nodes.filter((n: any) => n.parentID == parentID);
  }

  // Returns a node if nodes have a node whose id is parentID
  // Otherwise, return children as an array
  export function convertArrayToTree(nodes: any, parentID: string | undefined) {
    const children: any[] = [];
    const found = findNode(nodes, parentID);

    for (const child of getChildNodes(nodes, parentID)) {
      children.push(convertArrayToTree(nodes, child.id));
    }

    children.sort((a, b) => (a.index - b.index));

    for (const child of children) {
      delete child.parentID;
      delete child.index;
    }

    if (found == null) {
      return children;
    }

    found.children = children;
    return found;
  }

  export function convert(data: any) {
    const root = {
      type: 'directory',
      id: 'master',
      children: convertArrayToTree(data.nodes, undefined)
    } as DirectoryNode;

    const trash = {
      type: 'directory',
      id: 'trash',
      children: convertArrayToTree(data.nodes, 'trash')
    } as DirectoryNode;

    data.nodes = [root, trash];

    return data;
  }
}

export namespace Version9 {
  export function convert(data: any) {
    for (const node of visit(data.nodes) as any) {
      if (node.type == 'text' || node.type == 'heading' || node.type == 'quote') {
        node.content = [node.content];
      }
    }

    return data;
  }
}

export namespace Version10 {
  export function convert(data: any) {
    data.nodes = {
      type: 'directory',
      id: 'root',
      children: data.nodes
    };

    return data;
  }
}

export namespace Version11 {
  export function convert(data: any) {
    for (const node of visit(data.nodes) as any) {
      if (node.type == 'text-embed') {
        node.type = 'code';
      }
    }

    return data;
  }
}