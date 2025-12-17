'use client';

import { useState } from 'react';

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json();
      setError(data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-8 max-w-md mx-auto space-y-4">
      <div className="space-y-2">
        <h1 className="font-serif text-2xl text-midnight">Admin Login</h1>
        <p className="text-sm text-midnight/70">Enter the credentials from your environment configuration.</p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-midnight/70">Username</span>
        <input
          className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-midnight/70">Password</span>
        <input
          type="password"
          className="w-full rounded-xl border border-midnight/10 px-3 py-2 bg-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-midnight text-white py-2 font-semibold hover:bg-midnight/90"
      >
        {loading ? 'Signing in…' : 'Login'}
      </button>
    </form>
  );
}