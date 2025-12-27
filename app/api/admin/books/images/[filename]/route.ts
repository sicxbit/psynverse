import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const IMAGE_DIR = path.join(process.cwd(), 'app', 'api', 'admin', 'books', 'images');

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const trimmedFilename = filename?.trim();

  if (!trimmedFilename) {
    return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
  }

  const safeFilename = path.basename(trimmedFilename);

  try {
    const filePath = path.join(IMAGE_DIR, safeFilename);
    const data = await fs.readFile(filePath);
    const contentType = safeFilename.endsWith('.png') ? 'image/png' : 'application/octet-stream';
    return new NextResponse(data, { headers: { 'Content-Type': contentType } });
  } catch (error) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
}
