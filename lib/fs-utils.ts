import fs from 'fs/promises';
import path from 'path';

export async function writeJsonAtomic(targetPath: string, data: unknown) {
  const tmpPath = `${targetPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, targetPath);
}

export function resolveContentPath(...segments: string[]) {
  return path.join(process.cwd(), 'content', ...segments);
}