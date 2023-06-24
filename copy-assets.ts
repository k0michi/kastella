import * as fs from 'fs/promises';

async function main() {
  await fs.mkdir('public', { recursive: true });
  await fs.cp('node_modules/@excalidraw/excalidraw/dist/excalidraw-assets', 'public/excalidraw-assets', { recursive: true });
  await fs.cp('node_modules/@excalidraw/excalidraw/dist/excalidraw-assets-dev', 'public/excalidraw-assets-dev', { recursive: true });
}

main();