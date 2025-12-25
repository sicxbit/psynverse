import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { requireAdmin } from '../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const BASE_FOLDER = 'psynverse';

cloudinary.config({ secure: true });

function resolveFolder(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('folder');
  if (!param) return BASE_FOLDER;
  const sanitized = param.replace(/[^\w\-\/]/g, '').replace(/\/+/g, '/');
  const normalized = sanitized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');
  return normalized ? `${BASE_FOLDER}/${normalized}` : BASE_FOLDER;
}

function uploadToCloudinary(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload failed'));
        }
        resolve(result);
      },
    );
    upload.end(buffer);
  });
}

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json({ message: 'CLOUDINARY_URL is not configured' }, { status: 500 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ message: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: 'File is required' }, { status: 400 });
  }

  if (!file.type || !file.type.startsWith('image/')) {
    return NextResponse.json({ message: 'Only image uploads are allowed' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ message: 'Image must be 5MB or smaller' }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const folder = resolveFolder(req);

  try {
    const result = await uploadToCloudinary(buffer, folder);
    return NextResponse.json({
      ok: true,
      url: result.secure_url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('Cloudinary upload failed', error);
    return NextResponse.json({ message: 'Failed to upload image' }, { status: 500 });
  }
}
