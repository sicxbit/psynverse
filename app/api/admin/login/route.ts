import { NextRequest, NextResponse } from 'next/server';
import { buildSessionCookie, createSession } from '../../../../../lib/auth';
import { COOKIE_NAME } from '../../../../../lib/constants';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ message: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
  }

  if (username !== adminUser || password !== adminPassword) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }

  const token = createSession(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...buildSessionCookie(token), name: COOKIE_NAME });
  return res;
}