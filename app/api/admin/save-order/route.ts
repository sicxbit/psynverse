import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { setBlogOrder } from '../../../../lib/db/settings';
import { sanitizeSlug } from '../../../../lib/db/posts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { blogOrder } = await req.json();
  if (!Array.isArray(blogOrder)) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const sanitized = blogOrder.map((slug: string) => sanitizeSlug(String(slug || ''))).filter(Boolean);

  try {
    await setBlogOrder(sanitized);
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Failed to save order' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, blogOrder: sanitized });
}
