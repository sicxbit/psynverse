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
      <div className="space-y-3">
        <h1 className="font-serif text-3xl text-midnight">Journal</h1>
        <p className="text-midnight/70">Browse reflective essays, practices, and musings from the Psynverse journal.</p>
      </div>
      <Suspense>
        <BlogList posts={posts} />
      </Suspense>
    </main>
  );
}