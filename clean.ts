import * as fs from 'fs/promises';

async function main() {
  await fs.rm('dist', { recursive: true });
  await fs.rm('public/excalidraw-assets', { recursive: true });
  await fs.rm('public/excalidraw-assets-dev', { recursive: true });
}

main();