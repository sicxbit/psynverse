import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { requireAdmin } from '../../../../lib/auth';
import { resolveContentPath, writeJsonAtomic } from '../../../../lib/fs-utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { blogOrder } = await req.json();
  if (!Array.isArray(blogOrder)) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const settingsPath = resolveContentPath('site-settings.json');
  let settings = { blogOrder: [] as string[], bookOrder: [] as string[] };
  try {
    const raw = await fs.readFile(settingsPath, 'utf8');
    settings = JSON.parse(raw);
  } catch {
    // defaults
  }
  settings.blogOrder = blogOrder;
  await writeJsonAtomic(settingsPath, settings);
  return NextResponse.json({ ok: true });
}
