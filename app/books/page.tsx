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
      <div className="grid md:grid-cols-2 gap-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </main>
  );
}