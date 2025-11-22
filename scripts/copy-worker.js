import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const src = join(rootDir, 'src', 'services', 'slack-worker.js');
const dest = join(rootDir, 'dist', 'services', 'slack-worker.js');

try {
  mkdirSync(join(rootDir, 'dist', 'services'), { recursive: true });
  copyFileSync(src, dest);
  console.log('✓ Copied slack-worker.js');
} catch (error) {
  console.error('Failed to copy slack-worker.js:', error);
  process.exit(1);
}

