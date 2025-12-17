'use client';

import { useState } from 'react';
import type { Book, Post } from '../lib/content';

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function AdminPanel({ posts, books }: { posts: Post[]; books: Book[] }) {
  const [blogOrder, setBlogOrder] = useState(posts.map((p) => p.slug));
  const [bookList, setBookList] = useState(books);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

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
    const res = await fetch('/api/admin/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books: bookList }),
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
      { id: `book-${Date.now()}`, title: 'New Book', author: 'Author', link: '#', note: '' },
    ]);
  };

  const deleteBook = (index: number) => {
    setBookList((prev) => prev.filter((_, i) => i !== index));
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
            const post = posts.find((p) => p.slug === slug);
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-midnight/60">{book.id}</p>
                <div className="flex gap-2">
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
                  <button onClick={() => deleteBook(index)} className="rounded-lg border px-3 py-1 text-sm text-red-600">
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-midnight/70">Title</span>
                  <input
                    value={book.title}
                    onChange={(e) => handleBookChange(index, 'title', e.target.value)}
                    className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
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
                  <span className="text-xs text-midnight/70">Link</span>
                  <input
                    value={book.link}
                    onChange={(e) => handleBookChange(index, 'link', e.target.value)}
                    className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
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