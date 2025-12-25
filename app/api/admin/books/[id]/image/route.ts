import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth';
import { updateBookImage } from '../../../../../../lib/db/books';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname;
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id?: string } }) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const id = params?.id ? String(params.id).trim() : '';
  if (!id) {
    return NextResponse.json({ message: 'Book id is required' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const image = typeof body?.image === 'string' ? body.image.trim() : '';

  if (!image || !isValidHttpsUrl(image)) {
    return NextResponse.json({ message: 'A valid https image URL is required' }, { status: 400 });
  }

  try {
    await updateBookImage(id, image);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to update book image' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, image });
}
