import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { requireAdmin } from '../../../../lib/auth';
import { resolveContentPath, writeJsonAtomic } from '../../../../lib/fs-utils';
import { getPostBySlug } from '../../../../lib/content';
import type { PostFrontmatter, SiteSettings } from '../../../../lib/content';

type PostPayload = {
  title?: string;
  slug?: string;
  date?: string;
  excerpt?: string;
  tags?: string[] | string;
  coverImage?: string;
  content?: string;
};

type NormalizedPost = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags: string[] | string;
  coverImage?: string;
  content: string;
};

const BLOG_DIR = resolveContentPath('blog');
const SETTINGS_PATH = resolveContentPath('site-settings.json');

function sanitizeSlug(value: string) {
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

async function ensureBlogDir() {
  await fs.mkdir(BLOG_DIR, { recursive: true });
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findExistingPath(slug: string) {
  const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (await pathExists(mdxPath)) return mdxPath;
  const mdPath = path.join(BLOG_DIR, `${slug}.md`);
  if (await pathExists(mdPath)) return mdPath;
  return null;
}

async function readSettings(): Promise<SiteSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf8');
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return { blogOrder: [], bookOrder: [] } satisfies SiteSettings;
  }
}

async function saveSettings(settings: SiteSettings) {
  await writeJsonAtomic(SETTINGS_PATH, settings);
}

async function updateBlogOrder(slug: string, previousSlug?: string) {
  const settings = await readSettings();
  const baseOrder = settings.blogOrder;
  const targetSlug = previousSlug || slug;
  const existingIndex = baseOrder.findIndex((entry) => entry === targetSlug || entry === slug);
  const filtered = baseOrder.filter((entry) => entry !== slug && entry !== previousSlug);
  if (existingIndex >= 0 && existingIndex <= filtered.length) {
    filtered.splice(existingIndex, 0, slug);
  } else {
    filtered.unshift(slug);
  }
  settings.blogOrder = filtered;
  await saveSettings(settings);
  return settings.blogOrder;
}

async function removeFromBlogOrder(slug: string) {
  const settings = await readSettings();
  settings.blogOrder = settings.blogOrder.filter((entry) => entry !== slug);
  await saveSettings(settings);
  return settings.blogOrder;
}

function buildFrontmatter(payload: NormalizedPost, slug: string): PostFrontmatter {
  const frontmatter: PostFrontmatter = {
    title: payload.title,
    date: payload.date,
    excerpt: payload.excerpt,
    tags: normalizeTags(payload.tags),
    slug,
  };

  if (payload.coverImage) {
    frontmatter.coverImage = payload.coverImage;
  }

  return frontmatter;
}

function normalizePostInput(post?: PostPayload): NormalizedPost | null {
  if (!post) return null;
  const title = String(post.title || '').trim();
  const date = String(post.date || '').trim();
  const excerpt = String(post.excerpt || '').trim();
  const content = String(post.content || '').trim();
  const slugSource = sanitizeSlug(String(post.slug || title));

  if (!title || !date || !excerpt || !slugSource) {
    return null;
  }

  return {
    title,
    date,
    excerpt,
    slug: slugSource,
    tags: normalizeTags(post.tags),
    coverImage: post.coverImage ? String(post.coverImage).trim() : undefined,
    content,
  };
}

async function writePostFile(targetPath: string, payload: NormalizedPost | null) {
  if (!payload) return;
  const frontmatter = buildFrontmatter(payload, payload.slug);
  const fileContents = matter.stringify(payload.content, frontmatter);
  await fs.writeFile(targetPath, fileContents, 'utf8');
}

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { post } = await req.json();
  const payload = normalizePostInput(post);
  if (!payload) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  await ensureBlogDir();
  const existingPath = await findExistingPath(payload.slug);
  if (existingPath) {
    return NextResponse.json({ message: 'A post with this slug already exists' }, { status: 409 });
  }

  const filePath = path.join(BLOG_DIR, `${payload.slug}.md`);
  await writePostFile(filePath, payload);
  const blogOrder = await updateBlogOrder(payload.slug);
  const savedPost = await getPostBySlug(payload.slug);

  return NextResponse.json({ post: savedPost, blogOrder });
}

export async function PUT(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { post, originalSlug } = await req.json();
  const payload = normalizePostInput(post);
  if (!payload) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const currentSlug = sanitizeSlug(String(originalSlug || payload.slug));
  const existingPath = await findExistingPath(currentSlug);
  if (!existingPath) {
    return NextResponse.json({ message: 'Post not found' }, { status: 404 });
  }

  if (currentSlug !== payload.slug) {
    const conflictPath = await findExistingPath(payload.slug);
    if (conflictPath) {
      return NextResponse.json({ message: 'A post with the new slug already exists' }, { status: 409 });
    }
  }

  await ensureBlogDir();
  const extension = path.extname(existingPath) || '.md';
  const targetPath = path.join(BLOG_DIR, `${payload.slug}${extension}`);
  await writePostFile(targetPath, payload);

  if (targetPath !== existingPath) {
    await fs.unlink(existingPath);
  }

  const blogOrder = await updateBlogOrder(payload.slug, currentSlug);
  const savedPost = await getPostBySlug(payload.slug);

  return NextResponse.json({ post: savedPost, blogOrder });
}

export async function DELETE(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await req.json();
  const sanitizedSlug = sanitizeSlug(String(slug || ''));
  if (!sanitizedSlug) {
    return NextResponse.json({ message: 'Invalid slug' }, { status: 400 });
  }

  const existingPath = await findExistingPath(sanitizedSlug);
  if (!existingPath) {
    return NextResponse.json({ message: 'Post not found' }, { status: 404 });
  }

  await fs.unlink(existingPath);
  const blogOrder = await removeFromBlogOrder(sanitizedSlug);

  return NextResponse.json({ ok: true, blogOrder });
}
