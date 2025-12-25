import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import type { Book } from '../../../../lib/content-shared';
import { saveBooks as saveBooksToDb } from '../../../../lib/db/books';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { books } = await req.json();
  if (!Array.isArray(books)) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const cleaned: Book[] = books.map((book) => ({
    id: String(book.id),
    title: String(book.title || '').trim(),
    author: String(book.author || '').trim(),
    link: String(book.link || '#').trim(),
    image: book.image ? String(book.image).trim() : undefined,
    note: book.note ? String(book.note).trim() : '',
  }));

  try {
    await saveBooksToDb(cleaned);
    revalidatePath('/');
    revalidatePath('/books');
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Failed to save books' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
