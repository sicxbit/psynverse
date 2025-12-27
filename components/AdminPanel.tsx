'use client';

import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { useMemo, useState } from 'react';
import type { Book, Post } from '../lib/content-shared';
import { applyPostOrdering } from '../lib/content-shared';
import { MarkdownEditor } from './admin/MarkdownEditor';

type ActionStatus = 'idle' | 'saving' | 'success' | 'error';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const STATUS_RESET_MS = 1500;

const getTodayISODate = () => {
  return new Date().toISOString().slice(0, 10);
};

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

const setActionStatusWithReset = (setter: Dispatch<SetStateAction<ActionStatus>>, status: ActionStatus) => {
  setter(status);
  if (status === 'success' || status === 'error') {
    setTimeout(() => setter('idle'), STATUS_RESET_MS);
  }
};

const setUploadStatusWithReset = (setter: Dispatch<SetStateAction<UploadStatus>>, status: UploadStatus) => {
  setter(status);
  if (status === 'success' || status === 'error') {
    setTimeout(() => setter('idle'), STATUS_RESET_MS);
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

const getUploadLabel = (status: UploadStatus, idleLabel: string, successLabel = 'Uploaded ✓') => {
  switch (status) {
    case 'uploading':
      return 'Uploading…';
    case 'success':
      return successLabel;
    case 'error':
      return 'Upload failed';
    default:
      return idleLabel;
  }
};

export function AdminPanel({ posts, books }: { posts: Post[]; books: Book[] }) {
  const [blogOrder, setBlogOrder] = useState(posts.map((p) => p.slug));
  const [postList, setPostList] = useState(posts);
  const [bookList, setBookList] = useState(books);
  const [message, setMessage] = useState('');
  const [blogOrderStatus, setBlogOrderStatus] = useState<ActionStatus>('idle');
  const [booksSaveStatus, setBooksSaveStatus] = useState<ActionStatus>('idle');
  const [postSaveStatus, setPostSaveStatus] = useState<ActionStatus>('idle');
  const [postDeleting, setPostDeleting] = useState(false);
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

  const readErrorMessage = async (res: Response, fallback: string) => {
    const data = await res.json().catch(() => ({}));
    return data?.message || fallback;
  };

  const orderedPosts = useMemo(() => applyPostOrdering(postList, blogOrder), [postList, blogOrder]);
  const bookUploadState = (bookId: string) => bookUploadStatus[bookId] || 'idle';

  const resetPostForm = () => {
    setEditingSlug(null);
    setPostForm({
      title: '',
      slug: '',
      date: getTodayISODate(),
      excerpt: '',
      tags: '',
      coverImage: '',
      content: '',
    });
  };

  const saveBlogOrder = async () => {
    setMessage('');
    setActionStatusWithReset(setBlogOrderStatus, 'saving');
    try {
      const res = await fetch('/api/admin/save-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ blogOrder }),
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, 'Failed to save order.');
        setMessage(message);
        setActionStatusWithReset(setBlogOrderStatus, 'error');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.blogOrder)) {
        setBlogOrder(data.blogOrder);
      }
      setMessage('Blog order saved.');
      setActionStatusWithReset(setBlogOrderStatus, 'success');
    } catch (error: any) {
      setMessage(error?.message || 'Failed to save order.');
      setActionStatusWithReset(setBlogOrderStatus, 'error');
    }
  };

  const saveBooks = async () => {
    setMessage('');
    setActionStatusWithReset(setBooksSaveStatus, 'saving');
    const cleanedBooks = bookList.map((book) => ({
      ...book,
      title: book.title.trim(),
      link: book.link.trim(),
      author: book.author.trim(),
      image: book.image?.trim() || '',
      note: book.note?.trim() || '',
    }));
    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ books: cleanedBooks }),
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, 'Failed to update books.');
        setMessage(message);
        setActionStatusWithReset(setBooksSaveStatus, 'error');
        return;
      }
      setMessage('Books updated.');
      setActionStatusWithReset(setBooksSaveStatus, 'success');
    } catch (error: any) {
      setMessage(error?.message || 'Failed to update books.');
      setActionStatusWithReset(setBooksSaveStatus, 'error');
    }
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
    setActionStatusWithReset(setPostSaveStatus, 'saving');
    const payload = {
      post: postForm,
      ...(editingSlug ? { originalSlug: editingSlug } : {}),
    };
    try {
      const res = await fetch('/api/admin/posts', {
        method: editingSlug ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, 'Failed to save post.');
        setMessage(message);
        setActionStatusWithReset(setPostSaveStatus, 'error');
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
      setActionStatusWithReset(setPostSaveStatus, 'success');
      resetPostForm();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to save post.');
      setActionStatusWithReset(setPostSaveStatus, 'error');
    }
  };

  const deletePost = async (slug: string) => {
    setMessage('');
    setPostDeleting(true);
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, 'Failed to delete post.');
        setMessage(message);
        setPostDeleting(false);
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
      setPostDeleting(false);
    } catch (error: any) {
      setMessage(error?.message || 'Failed to delete post.');
      setPostDeleting(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    window.location.reload();
  };

  const uploadPostCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('');
    setUploadStatusWithReset(setPostCoverUploadStatus, 'uploading');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload?folder=blog', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to upload cover image.');
      setUploadStatusWithReset(setPostCoverUploadStatus, 'error');
      event.target.value = '';
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data.secure_url) {
      setPostForm((prev) => ({ ...prev, coverImage: data.secure_url }));
    }
    setMessage('Cover image uploaded.');
    setUploadStatusWithReset(setPostCoverUploadStatus, 'success');
    event.target.value = '';
  };

  const updateBookUploadStatus = (bookId: string, status: UploadStatus) => {
    setBookUploadStatus((prev) => ({ ...prev, [bookId]: status }));
    if (status === 'success' || status === 'error') {
      setTimeout(() => {
        setBookUploadStatus((prev) => {
          if (prev[bookId] !== status) return prev;
          return { ...prev, [bookId]: 'idle' };
        });
      }, STATUS_RESET_MS);
    }
  };

  const persistBookImage = async (bookId: string, imageUrl: string) => {
    const res = await fetch(`/api/admin/books/${bookId}/image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ image: imageUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok !== true) {
      throw new Error(data?.message || 'Failed to save book image.');
    }
    return data;
  };

  const uploadBookImage = async (bookId: string, index: number, file: File) => {
    setMessage('');
    updateBookUploadStatus(bookId, 'uploading');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload?folder=books', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'Failed to upload book image.');
      updateBookUploadStatus(bookId, 'error');
      return;
    }

    const data = await res.json().catch(() => ({}));
    const secureUrl = data.secure_url || data.url;
    if (!secureUrl) {
      setMessage('Failed to upload book image.');
      updateBookUploadStatus(bookId, 'error');
      return;
    }

    setBookList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], image: secureUrl };
      return copy;
    });

    try {
      await persistBookImage(bookId, secureUrl);
      setMessage('Book image saved.');
      updateBookUploadStatus(bookId, 'success');
    } catch (error: any) {
      setMessage(error?.message || 'Failed to save book image.');
      updateBookUploadStatus(bookId, 'error');
    }
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
            <button
              onClick={startNewPost}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white/70"
            >
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
          {/* LEFT: Post fields */}
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
            </div>
          </div>

          {/* RIGHT: Existing posts */}
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
                      <button onClick={() => startEditPost(post.slug)} className="rounded-lg border px-3 py-1 text-sm font-semibold">
                        Edit
                      </button>
                      <button
                        onClick={() => deletePost(post.slug)}
                        className="rounded-lg border px-3 py-1 text-sm font-semibold text-red-600"
                        disabled={postDeleting || postSaveStatus === 'saving'}
                      >
                        {getActionLabel(postDeleting ? 'saving' : 'idle', 'Delete')}
                      </button>
                    </div>
                  </div>
                  {post.tags?.length ? <p className="text-xs text-midnight/70">Tags: {post.tags.join(', ')}</p> : null}
                  {post.excerpt ? <p className="text-sm text-midnight/80">{post.excerpt}</p> : null}
                </div>
              ))}
            </div>
          </div>

          {/* ✅ FULL WIDTH: Editor spans both columns */}
          <div className="md:col-span-2">
            <MarkdownEditor value={postForm.content} onChange={(content) => handlePostFormChange('content', content)} />
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
                    onClick={() => index < blogOrder.length - 1 && setBlogOrder((prev) => moveItem(prev, index, index + 1))}
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
            <button onClick={addBook} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white/70">
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
                    onClick={() => index < bookList.length - 1 && setBookList((prev) => moveItem(prev, index, index + 1))}
                    className="rounded-lg border px-3 py-1 text-sm"
                    disabled={index === bookList.length - 1}
                  >
                    ↓
                  </button>
                  <button onClick={() => deleteBook(index)} className="rounded-lg border px-3 py-1 text-sm text-red-600">
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
                      uploadBookImage(book.id, index, file);
                      e.target.value = '';
                    }}
                    disabled={bookUploadState(book.id) === 'uploading'}
                  />
                  {getUploadLabel(bookUploadState(book.id), 'Upload image', 'Saved ✓')}
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
