import Link from 'next/link';
import { Suspense } from 'react';
import { getAllPosts } from '../../lib/content';
import { BlogList } from './sections/BlogList';

export const metadata = {
  title: 'Journal • Psynverse',
  description: 'Reflective writing and healing narratives.',
};

export default async function BlogPage() {
  const posts = await getAllPosts();
  return (
    <main className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="font-serif text-3xl text-midnight">Journal</h1>
          <p className="text-midnight/70">Browse reflective essays, practices, and musings from the Psynverse journal.</p>
        </div>
        <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white/70">
          Home
        </Link>
      </div>
      <Suspense>
        <BlogList posts={posts} />
      </Suspense>
    </main>
  );
}
