import * as React from 'react';
import { InlineAnchor, InlineNode, InlineNodeType, Node as KNode, NodeType } from "./node";

export function* visit(node: KNode[] | KNode, filter = (node: KNode) => true): Generator<KNode> {
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

export function isDirectory(node: KNode) {
  return node.type == NodeType.Directory;
}

export function inlineNodeToString(node: InlineNode | string | (InlineNode | string)[]): string {
  if (Array.isArray(node)) {
    return node.map(n => inlineNodeToString(n)).join();
  } else {
    if (typeof node == 'string') {
      return node;
    } else {
      return node.children.map(n => inlineNodeToString(n)).join();
    }
  }
}

export function inlineNodeToElement(node: InlineNode | string | (InlineNode | string)[]): string | React.ReactElement {
  if (Array.isArray(node)) {
    const children = node.map(n => inlineNodeToElement(n));
    return React.createElement(React.Fragment, {}, ...children);
  } else {
    if (typeof node == 'string') {
      return node;
    } else {
      const children = node.children.map(n => inlineNodeToElement(n));

      if (node.type == InlineNodeType.InlineAnchor) {
        const contentURL = (node as InlineAnchor).contentURL;
        return React.createElement('a', { href: contentURL }, ...children);
      } else if (node.type == InlineNodeType.Bold) {
        return React.createElement('b', {}, ...children);
      } else if (node.type == InlineNodeType.Italic) {
        return React.createElement('i', {}, ...children);
      } else if (node.type == InlineNodeType.Underline) {
        return React.createElement('u', {}, ...children);
      } else if (node.type == InlineNodeType.Strikethrough) {
        return React.createElement('s', {}, ...children);
      } else if (node.type == InlineNodeType.Subscript) {
        return React.createElement('sub', {}, ...children);
      } else if (node.type == InlineNodeType.Superscript) {
        return React.createElement('sup', {}, ...children);
      } else if (node.type == InlineNodeType.InlineCode) {
        return React.createElement('code', {}, ...children);
      }
    }
  }

  throw new Error('Not supported: ' + node.type);
}

export function elementToInlineNode(element: Element): InlineNode | (InlineNode | string)[] {
  const children: (InlineNode | string)[] = [];
  let nodeType: InlineNodeType | undefined;
  const tagName = element.tagName.toLowerCase();

  switch (tagName) {
    case 'b':
      nodeType = InlineNodeType.Bold;
      break;
    case 'i':
      nodeType = InlineNodeType.Italic;
      break;
    case 'u':
      nodeType = InlineNodeType.Underline;
      break;
    case 'strike':
      nodeType = InlineNodeType.Strikethrough;
      break;
    case 'sub':
      nodeType = InlineNodeType.Subscript;
      break;
    case 'sup':
      nodeType = InlineNodeType.Superscript;
      break;
    case 'code':
      nodeType = InlineNodeType.InlineCode;
      break;
    case 'body':
      break;
    default:
      throw new Error('Not supported: ' + tagName);
  }

  const hasOnlyPlain = nodeType == InlineNodeType.InlineCode;

  for (const childNode of element.childNodes) {
    if (childNode.nodeType === Node.ELEMENT_NODE) {
      if (hasOnlyPlain) {
        throw new Error('This node should only contain plain content');
      }

      const child = elementToInlineNode(childNode as Element);
      children.push(child as InlineNode);
    } else if (childNode.nodeType === Node.TEXT_NODE) {
      const data = (childNode as Text).data;
      children.push(data);
    }
  }

  if (tagName == 'body') {
    return children;
  } else {
    return {
      type: nodeType!,
      children
    } as InlineNode;
  }
}