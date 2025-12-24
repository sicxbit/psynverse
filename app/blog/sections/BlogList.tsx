'use client';

import { useMemo, useState } from 'react';
import { Post } from '../../../lib/content-shared';
import { TagFilter } from '../../../components/TagFilter';
import { PostCard } from '../../../components/PostCard';

export function BlogList({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(() => Array.from(new Set(posts.flatMap((p) => p.tags || []))), [posts]);

  const filtered = posts.filter((post) => {
    const matchesTag = activeTag ? post.tags?.includes(activeTag) : true;
    const matchesQuery = query
      ? [post.title, post.excerpt, ...(post.tags || [])].some((field) => field.toLowerCase().includes(query.toLowerCase()))
      : true;
    return matchesTag && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts..."
          className="w-full md:w-1/3 rounded-xl border border-midnight/10 px-3 py-2 bg-white"
        />
        <TagFilter tags={tags} active={activeTag} onChange={setActiveTag} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((post, idx) => (
          <PostCard key={post.slug} post={post} index={idx} />
        ))}
        {!filtered.length && <p className="text-midnight/60">No posts match your filters.</p>}
      </div>
    </div>
  );
}
