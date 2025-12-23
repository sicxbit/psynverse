import Link from 'next/link';
import { BrandHeader } from '../components/BrandHeader';
import { PostCard } from '../components/PostCard';
import { BookCard } from '../components/BookCard';
import { BRAND } from '../lib/constants';
import { getAllPosts, getBooks } from '../lib/content';

export default async function HomePage() {
  const posts = await getAllPosts();
  const books = await getBooks();

  return (
    <main className="space-y-10">
      <BrandHeader />

      <section className="card p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-midnight/60">About Psynverse</p>
          <h1 className="font-serif text-3xl md:text-4xl text-midnight">{BRAND.name}</h1>
          <p className="text-midnight/80 leading-relaxed">
            Psynverse is a calm corner of the web where introspection meets psychology. We share reflective journal
            entries, mindful prompts, and curated resources that make space for healing and steady self-understanding.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full bg-midnight text-white px-5 py-2 font-semibold hover:bg-midnight/90"
          >
            Read the Journal →
          </Link>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gradient-to-br from-white/70 to-sage/60 border border-white/80" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-midnight">Latest journal entries</h2>
          <Link href="/blog" className="text-sm font-semibold">See all</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {posts.slice(0, 3).map((post, idx) => (
            <PostCard key={post.slug} post={post} index={idx} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-midnight">Featured books & resources</h2>
          <Link href="/books" className="text-sm font-semibold">All books</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {books.slice(0, 3).map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      <section className="card p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-midnight/60">Certifications</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm text-midnight/70">
          <div className="rounded-xl bg-white/70 py-3">MSc Psychology</div>
          <div className="rounded-xl bg-white/70 py-3">Psychiatric Social Work (PG)</div>
          <div className="rounded-xl bg-white/70 py-3">Diploma in Counselling Psychology</div>
          <div className="rounded-xl bg-white/70 py-3">KAPS Professional Licence</div>
        </div>
      </section>

      <section className="card p-6 md:p-10 space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-midnight/60">About Fidha</p>
        <h2 className="font-serif text-3xl text-midnight">
          {BRAND.author} <span className="text-midnight/70">— {BRAND.credentials}</span>
        </h2>
        <p className="text-midnight/80 leading-relaxed">
          Fidha Nashim is a psychology practitioner and social worker who blends compassionate listening with practical
          tools. Her work is rooted in a postgraduate focus on psychiatric social work, a diploma in counselling
          psychology, and a KAPS Professional Licence.
        </p>
      </section>
    </main>
  );
}
