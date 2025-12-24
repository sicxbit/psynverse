'use client';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Post } from '../lib/content-shared';
import { motion } from 'framer-motion';

export function PostCard({ post, index }: { post: Post; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card p-6 flex flex-col gap-3"
    >
      {post.coverImage && (
        <div className="relative overflow-hidden rounded-xl border border-white/80 bg-sage/30 aspect-[16/9]">
          <Image
            src={post.coverImage}
            alt={`${post.title} cover`}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 768px) 480px, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="flex items-center justify-between text-sm text-midnight/60">
        <span>{format(new Date(post.date), 'PPP')}</span>
        <span>{post.readingMinutes} min read</span>
      </div>
      <h3 className="font-serif text-2xl text-midnight">{post.title}</h3>
      <p className="text-midnight/80">{post.excerpt}</p>
      <div className="flex flex-wrap gap-2">
        {post.tags?.map((tag) => (
          <span key={tag} className="rounded-full bg-sage/60 px-3 py-1 text-xs text-midnight/80">
            {tag}
          </span>
        ))}
      </div>
      <Link className="self-start text-sm font-semibold" href={`/blog/${post.slug}`}>
        View →
      </Link>
    </motion.article>
  );
}
