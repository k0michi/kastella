export function parseHTMLFragment(html: string) {
  const parser = new DOMParser();
  const fragment = parser.parseFromString(html, 'text/html');
  return fragment.body as HTMLElement;
}

export function isHTMLEmpty(html: string) {
  const fragment = parseHTMLFragment(html);
  return fragment.textContent == '';
}