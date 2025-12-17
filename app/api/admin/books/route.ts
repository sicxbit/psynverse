import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth';
import { resolveContentPath, writeJsonAtomic } from '../../../../../lib/fs-utils';
import fs from 'fs/promises';
import type { Book } from '../../../../../lib/content';

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
    title: String(book.title || ''),
    author: String(book.author || ''),
    link: String(book.link || '#'),
    note: book.note ? String(book.note) : '',
  }));

  const booksPath = resolveContentPath('books.json');
  await writeJsonAtomic(booksPath, cleaned);

  const settingsPath = resolveContentPath('site-settings.json');
  let settings = { blogOrder: [] as string[], bookOrder: [] as string[] };
  try {
    const raw = await fs.readFile(settingsPath, 'utf8');
    settings = JSON.parse(raw);
  } catch {
    // defaults
  }
  settings.bookOrder = cleaned.map((b) => b.id);
  await writeJsonAtomic(settingsPath, settings);

  return NextResponse.json({ ok: true });
}