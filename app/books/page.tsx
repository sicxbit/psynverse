import { getBooks } from '../../lib/content';
import { BookCard } from '../../components/BookCard';

export const metadata = {
  title: 'Books & Resources • Psynverse',
};

export default async function BooksPage() {
  const books = await getBooks();
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-midnight">Books & Resources</h1>
        <p className="text-midnight/70">Curated readings to accompany the journal.</p>
      </div>
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl text-midnight">Book Gallery</h2>
          <p className="text-sm text-midnight/70">Browse the covers and explore each resource.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>
    </main>
  );
}
