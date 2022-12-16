import { v4 as uuidv4 } from 'uuid';
import { DirectoryNode, NodeType, ReservedID } from './node';

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
      type: NodeType.Directory,
      id: ReservedID.Master,
      children: convertArrayToTree(data.nodes, undefined)
    } as DirectoryNode;

    const trash = {
      type: NodeType.Directory,
      id: ReservedID.Trash,
      children: convertArrayToTree(data.nodes, 'trash')
    } as DirectoryNode;

    data.nodes = [root, trash];
    
    return data;
  }
}