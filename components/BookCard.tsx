import Link from 'next/link';
import { Book } from '../lib/content';

export function BookCard({ book }: { book: Book }) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-midnight">{book.title}</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-sage/60 text-midnight/70">Resource</span>
      </div>
      <p className="text-midnight/70 text-sm">{book.author}</p>
      {book.note && <p className="text-midnight/80 text-sm">{book.note}</p>}
      <Link className="text-sm font-semibold" href={book.link} target="_blank" rel="noreferrer">
        Visit →
      </Link>
    </div>
  );
}