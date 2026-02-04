const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({
  path: path.resolve(process.cwd(), '../../.env'),
});

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('No Prisma arguments provided.');
  process.exit(1);
}

const result = spawnSync('prisma', args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
