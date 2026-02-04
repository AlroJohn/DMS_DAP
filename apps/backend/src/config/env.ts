import fs from 'fs';
import path from 'path';

const getEnvCandidates = (): string[] => [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../.env'),
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
