const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({
  path: path.resolve(process.cwd(), '../../.env'),
});

const result = spawnSync('tsx', ['prisma/seed.ts'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 1);
