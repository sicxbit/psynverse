import { unstable_noStore as noStore } from 'next/cache';
import readingTime from 'reading-time';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { applyPostOrdering, type Post } from '../content-shared';
import { getDb } from '../mongo';
import { getSettings } from './settings';

type PostDoc = {
  _id: string;
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags: string[];
  coverImage?: string;
  content: string;
  published?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PostInput = {
  title?: string;
  slug?: string;
  date?: string;
  excerpt?: string;
  tags?: string[] | string;
  coverImage?: string;
  content?: string;
  published?: boolean;
};

type HttpError = Error & { status?: number };

function httpError(status: number, message: string): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  return err;
}

export function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTags(tags?: string[] | string) {
  if (!tags) return [] as string[];
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function normalizePostInput(post?: PostInput) {
  if (!post) throw httpError(400, 'Invalid payload');

  const title = String(post.title || '').trim();
  const date = String(post.date || '').trim();
  const excerpt = String(post.excerpt || '').trim();
  const content = String(post.content || '').trim();
  const slugSource = sanitizeSlug(String(post.slug || title));

  if (!title || !date || !excerpt || !slugSource) {
    throw httpError(400, 'Missing required fields');
  }

  if (!validateDate(date)) {
    throw httpError(400, 'Date must be in YYYY-MM-DD format');
  }

  const cover = String(post.coverImage || '').trim();

  return {
    title,
    date,
    excerpt,
    slug: slugSource,
    tags: normalizeTags(post.tags),
    content,
    coverImage: cover || undefined,
    published: post.published ?? true,
  } as const;
}

function extractHeadings(content: string) {
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
  return headings;
}

function mapDocToPost(doc: PostDoc): Post {
  const content = doc.content || '';
  return {
    title: doc.title,
    slug: doc.slug,
    date: doc.date,
    excerpt: doc.excerpt,
    tags: doc.tags || [],
    coverImage: doc.coverImage,
    content,
    published: doc.published,
    createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
    readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
    headings: extractHeadings(content),
  };
}

export async function getAllPosts(): Promise<Post[]> {
  noStore();

  const db = await getDb();
  const [settings, posts] = await Promise.all([
    getSettings(),
    db.collection<PostDoc>('posts').find({}).toArray(),
  ]);

  const mapped = posts.map(mapDocToPost);
  return applyPostOrdering(mapped, settings.blogOrder || []);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  noStore();

  const sanitized = sanitizeSlug(slug);
  if (!sanitized) return null;

  const db = await getDb();
  const doc = await db.collection<PostDoc>('posts').findOne({ _id: sanitized });
  if (!doc) return null;
  return mapDocToPost(doc);
}

export async function upsertPost(payload: PostInput, originalSlug?: string): Promise<Post> {
  const normalized = normalizePostInput(payload);

  const db = await getDb();
  const collection = db.collection<PostDoc>('posts');

  const currentSlug = sanitizeSlug(originalSlug || normalized.slug);
  const targetSlug = normalized.slug;
  const now = new Date();

  const existingTarget = await collection.findOne({ _id: targetSlug });
  if (existingTarget && currentSlug !== targetSlug) {
    throw httpError(409, 'A post with this slug already exists.');
  }

  const existingCurrent = await collection.findOne({ _id: currentSlug });
  if (currentSlug && currentSlug !== targetSlug && !existingCurrent) {
    throw httpError(404, 'Post not found');
  }

  const doc: PostDoc = {
    _id: targetSlug,
    slug: targetSlug,
    title: normalized.title,
    date: normalized.date,
    excerpt: normalized.excerpt,
    tags: normalized.tags,
    coverImage: normalized.coverImage,
    content: normalized.content,
    published: normalized.published,
    createdAt: existingTarget?.createdAt || existingCurrent?.createdAt || now,
    updatedAt: now,
  };

  await collection.updateOne({ _id: targetSlug }, { $set: doc }, { upsert: true });

  if (currentSlug && currentSlug !== targetSlug) {
    await collection.deleteOne({ _id: currentSlug });
  }

  const saved = await collection.findOne({ _id: targetSlug });
  if (!saved) {
    throw httpError(500, 'Failed to save post');
  }

  return mapDocToPost(saved);
}

export async function deletePost(slug: string) {
  const sanitized = sanitizeSlug(slug);
  if (!sanitized) {
    throw httpError(400, 'Invalid slug');
  }

  const db = await getDb();
  const result = await db.collection<PostDoc>('posts').deleteOne({ _id: sanitized });
  if (result.deletedCount === 0) {
    throw httpError(404, 'Post not found');
  }
}
