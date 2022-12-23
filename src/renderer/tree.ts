import * as React from 'react';
import { InlineAnchor, InlineNode, InlineNodeType, Node, NodeType } from "./node";

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
      }
    }
  }

  throw new Error();
}