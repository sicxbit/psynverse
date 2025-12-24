'use client';

import { useMemo, useState } from 'react';
import type { Book, Post } from '../lib/content-shared';
import { applyPostOrdering } from '../lib/content-shared';

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function AdminPanel({ posts, books }: { posts: Post[]; books: Book[] }) {
  const [blogOrder, setBlogOrder] = useState(posts.map((p) => p.slug));
  const [postList, setPostList] = useState(posts);
  const [bookList, setBookList] = useState(books);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [postSaving, setPostSaving] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    slug: '',
    date: '',
    excerpt: '',
    tags: '',
    coverImage: '',
    content: '',
  });

  const orderedPosts = useMemo(() => applyPostOrdering(postList, blogOrder), [postList, blogOrder]);

  const resetPostForm = () => {
    setEditingSlug(null);
    setPostForm({
      title: '',
      slug: '',
      date: '',
      excerpt: '',
      tags: '',
      coverImage: '',
      content: '',
    });
  };

  const saveBlogOrder = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogOrder }),
    });
    setSaving(false);
    setMessage(res.ok ? 'Blog order saved.' : 'Failed to save order.');
  };

  const saveBooks = async () => {
    setSaving(true);
    const cleanedBooks = bookList.map((book) => ({
      ...book,
      title: book.title.trim(),
      link: book.link.trim(),
      author: book.author.trim(),
      note: book.note?.trim() || '',
    }));
    const res = await fetch('/api/admin/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books: cleanedBooks }),
    });
    setSaving(false);
    setMessage(res.ok ? 'Books updated.' : 'Failed to update books.');
  };

  const handleBookChange = (index: number, field: keyof Book, value: string) => {
    setBookList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addBook = () => {
    setBookList((prev) => [
      ...prev,
      { id: `book-${Date.now()}`, title: 'New Book', author: 'Author', link: '#', image: '', note: '' },
    ]);
  };

  const deleteBook = (index: number) => {
    setBookList((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostFormChange = (field: keyof typeof postForm, value: string) => {
    setPostForm((prev) => ({ ...prev, [field]: value }));
  };

  const startNewPost = () => {
    resetPostForm();
  };

  const startEditPost = (slug: string) => {
    const post = postList.find((p) => p.slug === slug);
    if (!post) return;
    setEditingSlug(slug);
    setPostForm({
      title: post.title,
      slug: post.slug,
      date: post.date,
      excerpt: post.excerpt,
      tags: post.tags?.join(', ') || '',
      coverImage: post.coverImage || '',
      content: post.content,
    });
  };

  const savePost = async () => {
    setPostSaving(true);
    setMessage('');
    const payload = {
      post: postForm,
      ...(editingSlug ? { originalSlug: editingSlug } : {}),
    };
    const res = await fetch('/api/admin/posts', {
      method: editingSlug ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setPostSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to save post.');
      return;
    }
    const data = await res.json();
    if (data.post) {
      const updatedList = [data.post, ...postList.filter((p) => p.slug !== (editingSlug || data.post.slug))];
      setPostList(updatedList);
    }
    if (data.blogOrder) {
      setBlogOrder(data.blogOrder);
    }
    setMessage(editingSlug ? 'Post updated.' : 'Post created.');
    resetPostForm();
  };

  const deletePost = async (slug: string) => {
    setPostSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    setPostSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to delete post.');
      return;
    }
    const data = await res.json();
    setPostList((prev) => prev.filter((p) => p.slug !== slug));
    if (data.blogOrder) {
      setBlogOrder(data.blogOrder);
    } else {
      setBlogOrder((prev) => prev.filter((entry) => entry !== slug));
    }
    if (editingSlug === slug) {
      resetPostForm();
    }
    setMessage('Post deleted.');
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-midnight">Admin Dashboard</h1>
          <p className="text-sm text-midnight/70">Manage the ordering of posts and featured books.</p>
        </div>
        <button onClick={logout} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white/70">
          Logout
        </button>
      </div>

      {message && <p className="text-sm text-midnight">{message}</p>}

      <section className="card p-6 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="font-serif text-2xl text-midnight">Blog posts</h2>
          <div className="flex gap-2">
            <button onClick={startNewPost} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white/70">
              New post
            </button>
            <button
              onClick={savePost}
              className="rounded-xl bg-midnight text-white px-4 py-2 text-sm font-semibold hover:bg-midnight/90"
              disabled={postSaving}
            >
              {editingSlug ? 'Update post' : 'Create post'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-midnight">{editingSlug ? 'Editing post' : 'New post'}</p>
              {editingSlug && (
                <button
                  onClick={resetPostForm}
                  className="text-xs rounded-lg border px-2 py-1 font-semibold text-midnight hover:bg-white/70"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <div className="space-y-3">
              <label className="space-y-1">
                <span className="text-xs text-midnight/70">Title</span>
                <input
                  value={postForm.title}
                  onChange={(e) => handlePostFormChange('title', e.target.value)}
                  className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-midnight/70">Slug</span>
                <input
                  value={postForm.slug}
                  onChange={(e) => handlePostFormChange('slug', e.target.value)}
                  className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                  placeholder="auto-generated from title if empty"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-midnight/70">Date</span>
                <input
                  value={postForm.date}
                  onChange={(e) => handlePostFormChange('date', e.target.value)}
                  className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                  placeholder="YYYY-MM-DD"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-midnight/70">Excerpt</span>
                <textarea
                  value={postForm.excerpt}
                  onChange={(e) => handlePostFormChange('excerpt', e.target.value)}
                  className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                  rows={2}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-midnight/70">Tags (comma separated)</span>
                <input
                  value={postForm.tags}
                  onChange={(e) => handlePostFormChange('tags', e.target.value)}
                  className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-midnight/70">Cover image URL</span>
                <input
                  value={postForm.coverImage}
                  onChange={(e) => handlePostFormChange('coverImage', e.target.value)}
                  className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-midnight/70">Content (Markdown)</span>
                <textarea
                  value={postForm.content}
                  onChange={(e) => handlePostFormChange('content', e.target.value)}
                  className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                  rows={6}
                />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-midnight">Existing posts</p>
            <div className="space-y-2 max-h-[540px] overflow-auto pr-1">
              {orderedPosts.map((post) => (
                <div key={post.slug} className="rounded-xl bg-white/70 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-midnight">{post.title}</p>
                      <p className="text-xs text-midnight/60">{post.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditPost(post.slug)}
                        className="rounded-lg border px-3 py-1 text-sm font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePost(post.slug)}
                        className="rounded-lg border px-3 py-1 text-sm font-semibold text-red-600"
                        disabled={postSaving}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {post.tags?.length ? (
                    <p className="text-xs text-midnight/70">Tags: {post.tags.join(', ')}</p>
                  ) : null}
                  {post.excerpt ? <p className="text-sm text-midnight/80">{post.excerpt}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-midnight">Blog ordering</h2>
          <button
            onClick={saveBlogOrder}
            className="rounded-xl bg-midnight text-white px-4 py-2 text-sm font-semibold hover:bg-midnight/90"
            disabled={saving}
          >
            Save order
          </button>
        </div>
        <ul className="space-y-3">
          {blogOrder.map((slug, index) => {
            const post = postList.find((p) => p.slug === slug);
            if (!post) return null;
            return (
              <li key={slug} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <div>
                  <p className="font-semibold text-midnight">{post.title}</p>
                  <p className="text-xs text-midnight/60">{post.date}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => index > 0 && setBlogOrder((prev) => moveItem(prev, index, index - 1))}
                    className="rounded-lg border px-3 py-1 text-sm"
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() =>
                      index < blogOrder.length - 1 && setBlogOrder((prev) => moveItem(prev, index, index + 1))
                    }
                    className="rounded-lg border px-3 py-1 text-sm"
                    disabled={index === blogOrder.length - 1}
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-midnight">Books & resources</h2>
          <div className="flex gap-2">
            <button
              onClick={addBook}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white/70"
            >
              Add book
            </button>
            <button
              onClick={saveBooks}
              className="rounded-xl bg-midnight text-white px-4 py-2 text-sm font-semibold hover:bg-midnight/90"
              disabled={saving}
            >
              Save books
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {bookList.map((book, index) => (
            <div key={book.id} className="rounded-2xl bg-white/70 p-4 space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-midnight/60 break-all">ID: {book.id}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => index > 0 && setBookList((prev) => moveItem(prev, index, index - 1))}
                    className="rounded-lg border px-3 py-1 text-sm"
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() =>
                      index < bookList.length - 1 && setBookList((prev) => moveItem(prev, index, index + 1))
                    }
                    className="rounded-lg border px-3 py-1 text-sm"
                    disabled={index === bookList.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => deleteBook(index)}
                    className="rounded-lg border px-3 py-1 text-sm text-red-600"
                  >
                    Delete
                  </button>
                  {book.link && (
                    <a
                      href={book.link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border px-3 py-1 text-sm font-semibold text-midnight hover:bg-white/70"
                    >
                      Open link
                    </a>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-midnight/70">Book name</span>
                  <input
                    value={book.title}
                    onChange={(e) => handleBookChange(index, 'title', e.target.value)}
                    className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                    placeholder="How the book appears on the site"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-midnight/70">Author</span>
                  <input
                    value={book.author}
                    onChange={(e) => handleBookChange(index, 'author', e.target.value)}
                    className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-midnight/70">Resource link</span>
                  <input
                    value={book.link}
                    onChange={(e) => handleBookChange(index, 'link', e.target.value)}
                    className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                    placeholder="https://example.com"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-midnight/70">Image URL</span>
                  <input
                    value={book.image || ''}
                    onChange={(e) => handleBookChange(index, 'image', e.target.value)}
                    className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                    placeholder="https://example.com/cover.jpg"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-midnight/70">Note</span>
                  <input
                    value={book.note || ''}
                    onChange={(e) => handleBookChange(index, 'note', e.target.value)}
                    className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
