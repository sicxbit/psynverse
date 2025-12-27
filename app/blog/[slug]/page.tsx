import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';
import { getAllPosts, getPostBySlug } from '../../../lib/content';
import { HomeLogoLink } from '../../../components/HomeLogoLink';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const trimmedSlug = slug?.trim();

  if (!trimmedSlug) {
    return { title: 'Post not found • Psynverse' };
  }

  const post = await getPostBySlug(trimmedSlug);
  if (!post) return { title: 'Post not found • Psynverse' };
  return {
    title: `${post.title} • Psynverse`,
    description: post.excerpt,
  };
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trimmedSlug = slug?.trim();

  if (!trimmedSlug) return notFound();

  const post = await getPostBySlug(trimmedSlug);
  if (!post || post.published === false) return notFound();

  const allPosts = await getAllPosts();
  const index = allPosts.findIndex((p) => p.slug === post.slug);
  const prev = index > 0 ? allPosts[index - 1] : null;
  const next = index < allPosts.length - 1 ? allPosts[index + 1] : null;

  return (
    <main className="relative space-y-6 pt-4">
      <HomeLogoLink className="absolute right-0 top-0" />
      <div className="space-y-2">
        <p className="text-sm text-midnight/60">{format(new Date(post.date), 'PPP')} • {post.readingMinutes} min read</p>
        <h1 className="font-serif text-4xl text-midnight">{post.title}</h1>
        <p className="text-midnight/70">{post.excerpt}</p>
        {post.tags?.length ? (
          <div className="flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-sage/60 px-3 py-1 text-xs text-midnight/80">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {post.headings.length > 0 && (
        <div className="card p-4 text-sm space-y-2">
          <p className="font-semibold text-midnight">On this page</p>
          <ul className="space-y-1 text-midnight/70">
            {post.headings.map((h) => (
              <li key={h.slug} className="ml-2">
                <a href={`#${h.slug}`}>{'— '.repeat(h.depth - 1)}{h.value}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {post.coverImage && (
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-sage/30 aspect-[16/9]">
          <Image
            src={post.coverImage}
            alt={`${post.title} cover`}
            fill
            sizes="(min-width: 1024px) 960px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      )}

      <article className="prose card p-6">
        <MDXRemote
          source={post.content}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeRaw, rehypeSlug] } }}
        />
      </article>

      <div className="flex items-center justify-between text-sm text-midnight/70">
        {prev ? <Link href={`/blog/${prev.slug}`}>← {prev.title}</Link> : <span />}
        {next ? <Link href={`/blog/${next.slug}`}>{next.title} →</Link> : <span />}
      </div>
    </main>
  );
}
