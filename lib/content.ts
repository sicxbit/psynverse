import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { BRAND } from './constants';
import { resolveContentPath } from './fs-utils';
import { applyPostOrdering, type Book, type Post, type PostFrontmatter } from './content-shared';
import { getSettings } from './db/settings';
import { getBooks as getBooksFromDb } from './db/books';

export async function getAllPosts(): Promise<Post[]> {
  const blogDir = resolveContentPath('blog');
  let files: string[] = [];
  try {
    files = await fs.readdir(blogDir);
  } catch {
    return [];
  }
  const posts: Post[] = [];

  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    const filePath = path.join(blogDir, file);
    const raw = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(raw);
    const fm = data as PostFrontmatter;
    if (!fm.slug) {
      fm.slug = file.replace(/\.(md|mdx)$/i, '');
    }
    const headings: { depth: number; value: string; slug: string }[] = [];
    const tree = remark().use(remarkGfm).parse(content);
    visit(tree, 'heading', (node: any) => {
      const text = node.children?.map((c: any) => c.value || c.children?.[0]?.value || '').join('') || '';
      const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      headings.push({ depth: node.depth, value: text, slug });
    });

    posts.push({
      ...fm,
      tags: fm.tags || [],
      content,
      readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
      headings,
    });
  }

  const settings = await getSettings();
  return applyPostOrdering(posts, settings.blogOrder);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}

export async function getBooks(): Promise<Book[]> {
  return getBooksFromDb();
}

export async function getBlogOrder() {
  const settings = await getSettings();
  return settings.blogOrder || [];
}

export async function getMetadataForRSS() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    title: post.title,
    link: `${BRAND.siteUrl}/blog/${post.slug}`,
    description: post.excerpt,
    date: new Date(post.date).toUTCString(),
  }));
}

export async function getSiteMapUrls() {
  const posts = await getAllPosts();
  const books = await getBooks();
  const urls = [
    '',
    '/blog',
    '/books',
    ...posts.map((p) => `/blog/${p.slug}`),
  ];
  return urls.map((path) => ({ url: `${BRAND.siteUrl}${path}`, lastModified: new Date() })).concat(
    books.map(() => ({ url: `${BRAND.siteUrl}/books`, lastModified: new Date() }))
  );
}
