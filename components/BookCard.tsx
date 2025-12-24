import Image from 'next/image';
import Link from 'next/link';
import { Book } from '../lib/content-shared';

export function BookCard({ book }: { book: Book }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-sage/40 to-sage/70 border border-white/80 aspect-[3/4]">
        {book.image ? (
          <Image src={book.image} alt={`${book.title} cover`} fill sizes="(min-width: 768px) 240px, 100vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-end p-4">
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-midnight/90 shadow-sm">
              {book.title}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-midnight">{book.title}</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-sage/60 text-midnight/70">Resource</span>
      </div>
      <p className="text-midnight/70 text-sm">{book.author}</p>
      {book.note && <p className="text-midnight/80 text-sm leading-relaxed">{book.note}</p>}
      <Link className="text-sm font-semibold" href={book.link} target="_blank" rel="noreferrer">
        Visit →
      </Link>
    </div>
  );
}
