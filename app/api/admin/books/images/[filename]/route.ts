import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const IMAGE_DIR = path.join(process.cwd(), 'app', 'api', 'admin', 'books', 'images');

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  try {
    const filePath = path.join(IMAGE_DIR, filename);
    const data = await fs.readFile(filePath);
    const contentType = filename.endsWith('.png') ? 'image/png' : 'application/octet-stream';
    return new NextResponse(data, { headers: { 'Content-Type': contentType } });
  } catch (error) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
}
