import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';
import { getAllPosts, getPostBySlug } from '../../../lib/content';
import { HomeLogoLink } from '../../../components/HomeLogoLink';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type ImageSize = 'sm' | 'md' | 'lg' | 'full';

function getSizeFromUrl(rawUrl: string): ImageSize {
  try {
    const u = new URL(rawUrl);
    const s = (u.searchParams.get('__sz') || 'md') as ImageSize;
    if (s === 'sm' || s === 'md' || s === 'lg' || s === 'full') return s;
    return 'md';
  } catch {
    const m = rawUrl.match(/[?&]__sz=(sm|md|lg|full)\b/);
    return (m?.[1] as ImageSize) || 'md';
  }
}

function getImageStyle(size: ImageSize) {
  const maxWidth =
    size === 'sm' ? 420 : size === 'md' ? 720 : size === 'lg' ? 1024 : 99999;

  return {
    display: 'block' as const,
    width: '100%',
    height: 'auto',
    maxWidth: size === 'full' ? '100%' : `${maxWidth}px`,
    margin: '16px auto',
    borderRadius: '12px',
    objectFit: 'contain' as const,
  };
}

const mdxComponents = {
  img: ({ src, alt }: { src?: string; alt?: string }) => {
    const raw = (src || '').toString();
    const size = getSizeFromUrl(raw);
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={raw} alt={alt || ''} style={getImageStyle(size)} />;
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const trimmedSlug = slug?.trim();

  if (!trimmedSlug) return { title: 'Post not found • Psynverse' };

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
  const next = index >= 0 && index < allPosts.length - 1 ? allPosts[index + 1] : null;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      <div className="mb-8 flex items-center justify-between">
        <HomeLogoLink />
        <Link href="/blog" className="text-sm text-midnight/70 hover:text-midnight">
          ← Back to blog
        </Link>
      </div>

      <header className="card mb-8 overflow-hidden">
        {post.coverImage ? (
          <div className="relative h-[240px] w-full md:h-[320px]">
            <Image src={post.coverImage} alt={post.title} fill className="object-cover" priority />
          </div>
        ) : null}

        <div className="p-6">
          <h1 className="text-3xl font-semibold text-midnight md:text-4xl">{post.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-midnight/70">
            {post.author ? <span>{post.author}</span> : null}
            {post.date ? <span>•</span> : null}
            {post.date ? <span>{format(new Date(post.date), 'MMM d, yyyy')}</span> : null}
          </div>

          {post.excerpt ? <p className="mt-4 text-midnight/80">{post.excerpt}</p> : null}
        </div>
      </header>

      <article className="prose card p-6">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }}
        />
      </article>

      <div className="mt-8 flex items-center justify-between text-sm text-midnight/70">
        {prev ? <Link href={`/blog/${prev.slug}`}>← {prev.title}</Link> : <span />}
        {next ? <Link href={`/blog/${next.slug}`}>{next.title} →</Link> : <span />}
      </div>
    </main>
  );
}
