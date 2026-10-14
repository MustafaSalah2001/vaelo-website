// Copies the backend's seed file so the offline demo shows exactly what the API seeds.
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../backend/src/CompanyWebsite.Infrastructure/Seed/demo-content.json');
const dest = resolve(here, '../src/content/demo-content.json');
copyFileSync(src, dest);
console.log(`Synced demo content → ${dest}`);
