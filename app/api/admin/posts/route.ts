import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { deletePost, getPostBySlug, sanitizeSlug, upsertPost } from '../../../../lib/db/posts';
import { getSettings, setBlogOrder } from '../../../../lib/db/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toErrorResponse(error: any, fallback: string, status = 500) {
  const message = error?.message || fallback;
  const code = typeof error?.status === 'number' ? error.status : status;
  return NextResponse.json({ message }, { status: code });
}

async function parseJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function updateBlogOrderAfterSave(slug: string, previousSlug?: string) {
  const targetSlug = sanitizeSlug(slug);
  const prevSlug = previousSlug ? sanitizeSlug(previousSlug) : targetSlug;
  const settings = await getSettings();
  const baseOrder = settings.blogOrder || [];
  const existingIndex = baseOrder.findIndex((entry) => entry === prevSlug || entry === targetSlug);
  const filtered = baseOrder.filter((entry) => entry !== targetSlug && entry !== prevSlug);
  if (existingIndex >= 0 && existingIndex <= filtered.length) {
    filtered.splice(existingIndex, 0, targetSlug);
  } else {
    filtered.unshift(targetSlug);
  }
  await setBlogOrder(filtered);
  return filtered;
}

async function removeFromBlogOrder(slug: string) {
  const safeSlug = sanitizeSlug(slug);
  const settings = await getSettings();
  const updated = (settings.blogOrder || []).filter((entry) => entry !== safeSlug);
  await setBlogOrder(updated);
  return updated;
}

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await parseJson(req);
  if (!body || typeof body !== 'object' || !body.post) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const { post } = body;
  try {
    const savedPost = await upsertPost(post);
    const blogOrder = await updateBlogOrderAfterSave(savedPost.slug);
    return NextResponse.json({ ok: true, post: savedPost, blogOrder });
  } catch (error: any) {
    return toErrorResponse(error, 'Failed to create post', error?.status || 500);
  }
}

export async function PUT(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await parseJson(req);
  if (!body || typeof body !== 'object' || !body.post) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const { post, originalSlug } = body;
  const safeOriginalSlug = originalSlug ? sanitizeSlug(String(originalSlug)) : undefined;
  const lookupSlug = safeOriginalSlug || sanitizeSlug(String(post?.slug || post?.title || ''));

  if (!lookupSlug) {
    return NextResponse.json({ message: 'Missing slug to update' }, { status: 400 });
  }

  const existing = await getPostBySlug(lookupSlug);
  if (!existing) {
    return NextResponse.json({ message: 'Post not found' }, { status: 404 });
  }

  try {
    const savedPost = await upsertPost(post, safeOriginalSlug || existing.slug);
    const blogOrder = await updateBlogOrderAfterSave(savedPost.slug, safeOriginalSlug || existing.slug);
    return NextResponse.json({ ok: true, post: savedPost, blogOrder });
  } catch (error: any) {
    return toErrorResponse(error, 'Failed to update post', error?.status || 500);
  }
}

export async function DELETE(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await parseJson(req);
  const slug = body?.slug;
  const sanitized = sanitizeSlug(String(slug || ''));
  if (!sanitized) {
    return NextResponse.json({ message: 'Invalid slug' }, { status: 400 });
  }

  const existing = await getPostBySlug(sanitized);
  if (!existing) {
    return NextResponse.json({ message: 'Post not found' }, { status: 404 });
  }

  try {
    await deletePost(sanitized);
    const blogOrder = await removeFromBlogOrder(sanitized);
    return NextResponse.json({ ok: true, blogOrder });
  } catch (error: any) {
    return toErrorResponse(error, 'Failed to delete post', error?.status || 500);
  }
}
