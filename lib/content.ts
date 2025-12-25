import { BRAND } from './constants';
import type { Book } from './content-shared';
import { type Post } from './content-shared';
import { getAllPosts as getPostsFromDb, getPostBySlug as getPostFromDb } from './db/posts';
import { getSettings } from './db/settings';
import { getBooks as getBooksFromDb } from './db/books';

export async function getAllPosts(options: { includeUnpublished?: boolean } = {}): Promise<Post[]> {
  const posts = await getPostsFromDb();
  if (options.includeUnpublished) return posts;
  return posts.filter((post) => post.published !== false);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return getPostFromDb(slug);
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
