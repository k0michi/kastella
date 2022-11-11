import { AnchorNode, DirectoryNode, File, ImageNode, Library, Node, NodeType, Tag, TextNode } from "./model";
import Timestamp from "./timestamp";

export function validateLibrary(library: Library) {
  assert(typeof library == 'object');
  assert(Array.isArray(library.nodes));

  for (const node of library.nodes) {
    validateNode(node);
  }

  assert(Array.isArray(library.files));

  for (const file of library.files) {
    validateFile(file);
  }

  assert(Array.isArray(library.tags));

  for (const tag of library.tags) {
    validateTag(tag);
  }
}

function validateNode(node: Node) {
  assert(typeof node === 'object');
  assert(typeof node.id === 'string');
  assert(typeof node.type === 'string');
  assert(node.created instanceof Timestamp);
  assert(node.modified instanceof Timestamp);
  assert(node.tags === undefined || Array.isArray(node.tags));

  if (Array.isArray(node.tags)) {
    for (const tag of node.tags) {
      assert(typeof tag == 'string');
    }
  }
  assert(typeof node.index === 'number');
  assert(node.parentID === undefined || typeof node.parentID === 'string');

  if (node.type === NodeType.Text) {
    const { content } = node as TextNode;
    assert(typeof content === 'string');
  } else if (node.type === NodeType.Image) {
    const { fileID, description } = node as ImageNode;
    assert(typeof fileID === 'string');
    assert(description === undefined || typeof description === 'string');
  } else if (node.type === NodeType.Anchor) {
    const {
      contentURL,
      contentType,
      contentTitle,
      contentDescription,
      contentImageFileID,
      contentModified,
      contentAccessed
    } = node as AnchorNode;
    assert(typeof contentURL === 'string');
    assert(typeof contentType === 'string');
    assert(contentTitle === undefined || typeof contentTitle === 'string');
    assert(contentDescription === undefined || typeof contentDescription === 'string');
    assert(contentImageFileID === undefined || typeof contentImageFileID === 'string');
    assert(contentModified === undefined || contentModified instanceof Timestamp);
    assert(contentAccessed instanceof Timestamp);
  } else if (node.type === NodeType.Directory) {
    const { name } = node as DirectoryNode;
    assert(typeof name === 'string');
  }
}

function validateFile(file: File) {
  assert(typeof file === 'object');
  assert(typeof file.id === 'string');
  assert(typeof file.type === 'string');
  assert(file.name === undefined || typeof file.name === 'string');
  assert(file.url === undefined || typeof file.url === 'string');
  assert(file.modified === undefined || file.modified instanceof Timestamp);
  assert(file.accessed instanceof Timestamp);
}

function validateTag(tag: Tag) {
  assert(typeof tag === 'object');
  assert(typeof tag.id === 'string');
  assert(typeof tag.name === 'string');
}

function assert(condition: boolean) {
  if (!condition) {
    throw new Error('Validation failed');
  }
}