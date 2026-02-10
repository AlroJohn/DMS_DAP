import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../../');

const getEnvCandidates = (): string[] => [
  path.resolve(repoRoot, '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];

export const resolveEnvPath = (): string => {
  const candidates = getEnvCandidates();
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
};
