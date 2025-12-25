'use client';

import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book, Post } from '../lib/content-shared';
import { applyPostOrdering } from '../lib/content-shared';

type ActionStatus = 'idle' | 'saving' | 'success' | 'error';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const STATUS_RESET_MS = 1500;

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

const setStatusWithReset = <T extends string>(
  setter: Dispatch<SetStateAction<T>>,
  status: T,
  registerTimeout: (id: number) => void,
) => {
  setter(status);
  if (status === 'success' || status === 'error') {
    const timeoutId = window.setTimeout(() => setter('idle' as T), STATUS_RESET_MS);
    registerTimeout(timeoutId);
  }
};

const getActionLabel = (status: ActionStatus, idleLabel: string) => {
  switch (status) {
    case 'saving':
      return 'Saving…';
    case 'success':
      return 'Saved ✓';
    case 'error':
      return 'Failed';
    default:
      return idleLabel;
  }
};

const getUploadLabel = (status: UploadStatus, idleLabel: string) => {
  switch (status) {
    case 'uploading':
      return 'Uploading…';
    case 'success':
      return 'Uploaded ✓';
    case 'error':
      return 'Upload failed';
    default:
      return idleLabel;
  }
};

export function AdminPanel({ posts, books }: { posts: Post[]; books: Book[] }) {
  const resetTimers = useRef<number[]>([]);
  const [blogOrder, setBlogOrder] = useState(posts.map((p) => p.slug));
  const [postList, setPostList] = useState(posts);
  const [bookList, setBookList] = useState(books);
  const [message, setMessage] = useState('');
  const [blogOrderStatus, setBlogOrderStatus] = useState<ActionStatus>('idle');
  const [booksSaveStatus, setBooksSaveStatus] = useState<ActionStatus>('idle');
  const [postSaveStatus, setPostSaveStatus] = useState<ActionStatus>('idle');
  const [postDeleteStatus, setPostDeleteStatus] = useState<ActionStatus>('idle');
  const [postCoverUploadStatus, setPostCoverUploadStatus] = useState<UploadStatus>('idle');
  const [bookUploadStatus, setBookUploadStatus] = useState<Record<string, UploadStatus>>({});
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
  const bookUploadState = (bookId: string) => bookUploadStatus[bookId] || 'idle';
  const registerTimeout = (id: number) => resetTimers.current.push(id);

  useEffect(() => {
    return () => {
      resetTimers.current.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

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
    setMessage('');
    setStatusWithReset(setBlogOrderStatus, 'saving', registerTimeout);
    const res = await fetch('/api/admin/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blogOrder }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to save order.');
      setStatusWithReset(setBlogOrderStatus, 'error', registerTimeout);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data.blogOrder)) {
      setBlogOrder(data.blogOrder);
    }
    setMessage('Blog order saved.');
    setStatusWithReset(setBlogOrderStatus, 'success', registerTimeout);
  };

  const saveBooks = async () => {
    setMessage('');
    setStatusWithReset(setBooksSaveStatus, 'saving', registerTimeout);
    const cleanedBooks = bookList.map((book) => ({
      ...book,
      title: book.title.trim(),
      link: book.link.trim(),
      author: book.author.trim(),
      image: book.image?.trim() || '',
      note: book.note?.trim() || '',
    }));
    const res = await fetch('/api/admin/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books: cleanedBooks }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to update books.');
      setStatusWithReset(setBooksSaveStatus, 'error', registerTimeout);
      return;
    }
    setMessage('Books updated.');
    setStatusWithReset(setBooksSaveStatus, 'success', registerTimeout);
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
    setMessage('');
    setStatusWithReset(setPostSaveStatus, 'saving', registerTimeout);
    const payload = {
      post: postForm,
      ...(editingSlug ? { originalSlug: editingSlug } : {}),
    };
    const res = await fetch('/api/admin/posts', {
      method: editingSlug ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to save post.');
      setStatusWithReset(setPostSaveStatus, 'error', registerTimeout);
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
    setStatusWithReset(setPostSaveStatus, 'success', registerTimeout);
    resetPostForm();
  };

  const deletePost = async (slug: string) => {
    setMessage('');
    setStatusWithReset(setPostDeleteStatus, 'saving', registerTimeout);
    const res = await fetch('/api/admin/posts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to delete post.');
      setStatusWithReset(setPostDeleteStatus, 'error', registerTimeout);
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
    setStatusWithReset(setPostDeleteStatus, 'success', registerTimeout);
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
  };

  const uploadPostCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('');
    setStatusWithReset(setPostCoverUploadStatus, 'uploading', registerTimeout);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to upload cover image.');
      setStatusWithReset(setPostCoverUploadStatus, 'error', registerTimeout);
      event.target.value = '';
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.secure_url) {
      setPostForm((prev) => ({ ...prev, coverImage: data.secure_url }));
    }
    setMessage('Cover image uploaded.');
    setStatusWithReset(setPostCoverUploadStatus, 'success', registerTimeout);
    event.target.value = '';
  };

  const updateBookUploadStatus = (bookId: string, status: UploadStatus) => {
    setBookUploadStatus((prev) => ({ ...prev, [bookId]: status }));
    if (status === 'success' || status === 'error') {
      const timeoutId = window.setTimeout(() => {
        setBookUploadStatus((prev) => {
          if (prev[bookId] !== status) return prev;
          return { ...prev, [bookId]: 'idle' };
        });
      }, STATUS_RESET_MS);
      registerTimeout(timeoutId);
    }
  };

  const uploadBookImage = async (bookId: string, file: File) => {
    setMessage('');
    updateBookUploadStatus(bookId, 'uploading');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to upload book image.');
      updateBookUploadStatus(bookId, 'error');
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.secure_url) {
      setBookList((prev) =>
        prev.map((book) => (book.id === bookId ? { ...book, image: data.secure_url } : book)),
      );
    }
    setMessage('Book image uploaded.');
    updateBookUploadStatus(bookId, 'success');
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
              className="rounded-xl bg-midnight text-white px-4 py-2 text-sm font-semibold hover:bg-midnight/90 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={postSaveStatus === 'saving'}
            >
              {getActionLabel(postSaveStatus, editingSlug ? 'Update post' : 'Create post')}
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
              <div className="flex items-center gap-2">
                <label
                  className={`rounded-lg border px-3 py-1 text-sm font-semibold text-midnight hover:bg-white/70 cursor-pointer ${
                    postCoverUploadStatus === 'uploading' ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadPostCover}
                    disabled={postCoverUploadStatus === 'uploading'}
                  />
                  {getUploadLabel(postCoverUploadStatus, 'Upload cover image')}
                </label>
                <p className="text-xs text-midnight/70">Upload to Cloudinary to fill the cover URL automatically.</p>
              </div>
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
                        className="rounded-lg border px-3 py-1 text-sm font-semibold text-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={postDeleteStatus === 'saving' || postSaveStatus === 'saving'}
                      >
                        {getActionLabel(postDeleteStatus, 'Delete')}
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
            className="rounded-xl bg-midnight text-white px-4 py-2 text-sm font-semibold hover:bg-midnight/90 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={blogOrderStatus === 'saving'}
          >
            {getActionLabel(blogOrderStatus, 'Save order')}
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
              className="rounded-xl bg-midnight text-white px-4 py-2 text-sm font-semibold hover:bg-midnight/90 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={booksSaveStatus === 'saving'}
            >
              {getActionLabel(booksSaveStatus, 'Save books')}
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
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`rounded-lg border px-3 py-1 text-sm font-semibold text-midnight hover:bg-white/70 cursor-pointer ${
                    bookUploadState(book.id) === 'uploading' ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      uploadBookImage(book.id, file);
                      e.target.value = '';
                    }}
                    disabled={bookUploadState(book.id) === 'uploading'}
                  />
                  {getUploadLabel(bookUploadState(book.id), 'Upload image')}
                </label>
                <p className="text-xs text-midnight/70">Upload a cover to populate the image URL automatically.</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
