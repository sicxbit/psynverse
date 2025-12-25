import type { Book } from '../content-shared';
import { getDb } from '../mongo';
import { getSettings, setBookOrder } from './settings';

type BookDoc = Book & {
  _id: string;
  updatedAt: Date;
};

function normalizeBook(input: Book): BookDoc {
  return {
    _id: input.id,
    id: input.id,
    title: input.title,
    author: input.author,
    link: input.link,
    image: input.image,
    note: input.note,
    updatedAt: new Date(),
  };
}

export async function getBooks(): Promise<Book[]> {
  const db = await getDb();
  const [settings, books] = await Promise.all([
    getSettings(),
    db.collection<BookDoc>('books').find({}).toArray(),
  ]);

  const map = new Map<string, Book>(
    books.map((b) => [b._id, { id: b._id, title: b.title, author: b.author, link: b.link, image: b.image, note: b.note }] as const)
  );
  const ordered: Book[] = [];

  for (const id of settings.bookOrder) {
    const book = map.get(id);
    if (book) {
      ordered.push(book);
      map.delete(id);
    }
  }

  return [...ordered, ...map.values()];
}

export async function saveBooks(books: Book[]): Promise<void> {
  const db = await getDb();
  const collection = db.collection<BookDoc>('books');

  const normalized = books.map(normalizeBook);
  const bulkOps = normalized.map((book) => ({
    updateOne: {
      filter: { _id: book._id },
      update: { $set: book },
      upsert: true,
    },
  }));

  const inputIds = new Set(normalized.map((b) => b._id));
  if (bulkOps.length > 0) {
    await collection.bulkWrite(bulkOps);
  }

  await collection.deleteMany({ _id: { $nin: Array.from(inputIds) } });

  await setBookOrder(normalized.map((b) => b._id));
}
