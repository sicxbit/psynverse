'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  uploadFolder?: string;
};

type SelectionState = {
  selectionStart: number;
  selectionEnd: number;
};

type ImageSize = 'sm' | 'md' | 'lg' | 'full';

const STATUS_RESET_MS = 1500;

const BUTTON_CLASS =
  'rounded-lg border border-midnight/10 bg-white px-3 py-2 text-xs font-semibold text-midnight/80 shadow-sm hover:bg-white/80 disabled:opacity-60 disabled:cursor-not-allowed';

const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type ToolbarButton =
  | { label: string; type: 'wrap'; prefix: string; suffix: string; placeholder: string }
  | { label: string; type: 'prefix'; prefix: string; placeholder: string; numbered?: boolean }
  | { label: string; type: 'link' };

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: 'Bold', type: 'wrap', prefix: '**', suffix: '**', placeholder: 'bold text' },
  { label: 'Italic', type: 'wrap', prefix: '*', suffix: '*', placeholder: 'italic text' },
  { label: 'H2', type: 'prefix', prefix: '## ', placeholder: 'Heading' },
  { label: 'H3', type: 'prefix', prefix: '### ', placeholder: 'Heading' },
  { label: 'Bullets', type: 'prefix', prefix: '- ', placeholder: 'List item' },
  { label: 'Numbers', type: 'prefix', prefix: '', placeholder: 'List item', numbered: true },
  { label: 'Link', type: 'link' },
];

// match markdown images (with or without query params)
const IMAGE_TOKEN_RX = /!\[([^\]]*)\]\(([^)]+)\)/g;

function addSizeToUrl(rawUrl: string, size: ImageSize) {
  try {
    const u = new URL(rawUrl);
    u.searchParams.set('__sz', size);
    return u.toString();
  } catch {
    // If it’s not an absolute URL, just append safely
    const hasQuery = rawUrl.includes('?');
    const join = hasQuery ? '&' : '?';
    return `${rawUrl}${join}__sz=${size}`;
  }
}

function getSizeFromUrl(rawUrl: string): ImageSize {
  try {
    const u = new URL(rawUrl);
    const s = (u.searchParams.get('__sz') || 'md') as ImageSize;
    if (s === 'sm' || s === 'md' || s === 'lg' || s === 'full') return s;
    return 'md';
  } catch {
    // fallback parse
    const m = rawUrl.match(/[?&]__sz=(sm|md|lg|full)\b/);
    return (m?.[1] as ImageSize) || 'md';
  }
}

function getImageStyle(size: ImageSize) {
  const maxWidth =
    size === 'sm' ? 210 : size === 'md' ? 420 : size === 'lg' ? 1024 : 99999;

  return {
    display: 'block' as const,
    width: '100%',
    height: 'auto',
    maxWidth: size === 'full' ? '100%' : `${maxWidth}px`,
    margin: '16px auto',
    borderRadius: '12px',
    objectFit: 'contain' as const,
  };
}

function removeLastImage(markdown: string) {
  const matches = Array.from(markdown.matchAll(IMAGE_TOKEN_RX));
  if (!matches.length) return { next: markdown, removed: null as null | string };

  const last = matches[matches.length - 1];
  const start = last.index ?? 0;
  const end = start + last[0].length;

  const removed = last[0];
  const next = (markdown.slice(0, start) + markdown.slice(end)).replace(/\n{3,}/g, '\n\n');
  return { next, removed };
}

function removeImageByUrl(markdown: string, url: string) {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)\\s*\\n?`, 'g');
  return markdown.replace(rx, '').replace(/\n{3,}/g, '\n\n');
}

export function MarkdownEditor({ value, onChange, uploadFolder = 'blog' }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState('');
  const [imageSize, setImageSize] = useState<ImageSize>('md');
  const [imageAlt, setImageAlt] = useState('');
  const [removeUrl, setRemoveUrl] = useState('');
  const [previewWidth, setPreviewWidth] = useState(820);

  const resetUploadStatus = (status: UploadStatus) => {
    setUploadStatus(status);
    if (status === 'success' || status === 'error') {
      setTimeout(() => setUploadStatus('idle'), STATUS_RESET_MS);
    }
  };

  const modifyValue = useCallback(
    (
      builder: (currentValue: string, selection: SelectionState) => {
        text: string;
        selectionStart: number;
        selectionEnd: number;
      },
    ) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const selectionStart = textarea.selectionStart ?? value.length;
      const selectionEnd = textarea.selectionEnd ?? value.length;

      const result = builder(value, { selectionStart, selectionEnd });
      onChange(result.text);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [onChange, value],
  );

  const wrapSelection = useCallback(
    (prefix: string, suffix: string, placeholder: string) => {
      modifyValue((currentValue, selection) => {
        const selectedText = currentValue.slice(selection.selectionStart, selection.selectionEnd) || placeholder;
        const wrapped = `${prefix}${selectedText}${suffix}`;
        const newValue =
          currentValue.slice(0, selection.selectionStart) + wrapped + currentValue.slice(selection.selectionEnd);
        const start = selection.selectionStart + prefix.length;
        const end = start + selectedText.length;
        return { text: newValue, selectionStart: start, selectionEnd: end };
      });
    },
    [modifyValue],
  );

  const prefixLines = useCallback(
    (prefix: string, placeholder: string, numbered = false) => {
      modifyValue((currentValue, selection) => {
        const selectedText = currentValue.slice(selection.selectionStart, selection.selectionEnd) || placeholder;
        const lines = selectedText.split('\n');
        const prefixPattern = numbered ? /^\d+\.\s*/ : new RegExp(`^${escapeForRegex(prefix)}?\\s*`);
        const prefixed = lines
          .map((line, index) => {
            const cleanLine = line.replace(prefixPattern, '');
            if (numbered) return `${index + 1}. ${cleanLine || placeholder}`;
            return `${prefix}${cleanLine || placeholder}`;
          })
          .join('\n');

        const newValue =
          currentValue.slice(0, selection.selectionStart) + prefixed + currentValue.slice(selection.selectionEnd);
        return { text: newValue, selectionStart: selection.selectionStart, selectionEnd: selection.selectionStart + prefixed.length };
      });
    },
    [modifyValue],
  );

  const applyLink = useCallback(() => {
    modifyValue((currentValue, selection) => {
      const selectedText = currentValue.slice(selection.selectionStart, selection.selectionEnd) || 'link text';
      const urlPlaceholder = 'https://';
      const linkMarkdown = `[${selectedText}](${urlPlaceholder})`;
      const newValue =
        currentValue.slice(0, selection.selectionStart) + linkMarkdown + currentValue.slice(selection.selectionEnd);
      const urlStart = selection.selectionStart + linkMarkdown.indexOf(urlPlaceholder);
      const urlEnd = urlStart + urlPlaceholder.length;
      return { text: newValue, selectionStart: urlStart, selectionEnd: urlEnd };
    });
  }, [modifyValue]);

  const handleToolbarClick = useCallback(
    (button: ToolbarButton) => {
      if (button.type === 'wrap') return wrapSelection(button.prefix, button.suffix, button.placeholder);
      if (button.type === 'prefix') return prefixLines(button.prefix, button.placeholder, button.numbered);
      applyLink();
    },
    [applyLink, prefixLines, wrapSelection],
  );

  const insertImageToken = (url: string, altText: string, size: ImageSize) => {
    modifyValue((currentValue, selection) => {
      const safeAltText = (altText.trim() || 'Image').replace(/\n/g, ' ');
      const urlWithSize = addSizeToUrl(url, size);
      const md = `\n![${safeAltText}](${urlWithSize})\n`;
      const newValue = currentValue.slice(0, selection.selectionStart) + md + currentValue.slice(selection.selectionEnd);
      const cursor = selection.selectionStart + md.length;
      return { text: newValue, selectionStart: cursor, selectionEnd: cursor };
    });
  };

  const uploadImage = async (file: File) => {
    setUploadError('');
    resetUploadStatus('uploading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/admin/upload?folder=${uploadFolder}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        resetUploadStatus('error');
        setUploadError(data?.message || 'Failed to upload image.');
        return;
      }

      const data = await res.json().catch(() => ({}));
      const secureUrl = data?.secure_url || data?.url;

      if (!secureUrl) {
        resetUploadStatus('error');
        setUploadError('Image URL missing from response.');
        return;
      }

      insertImageToken(secureUrl, imageAlt, imageSize);
      resetUploadStatus('success');
    } catch (error: any) {
      resetUploadStatus('error');
      setUploadError(error?.message || 'Failed to upload image.');
    }
  };

  const onRemoveLastImage = () => {
    const { next, removed } = removeLastImage(value);
    if (!removed) return;
    onChange(next);
  };

  const onRemoveByUrl = () => {
    const url = removeUrl.trim();
    if (!url) return;
    onChange(removeImageByUrl(value, url));
    setRemoveUrl('');
  };

  const hasAnyImages = useMemo(() => /!\[[^\]]*\]\([^)]+\)/.test(value), [value]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-midnight/70">Content (Markdown)</p>
        <div className="flex flex-wrap gap-2">
          {TOOLBAR_BUTTONS.map((button) => (
            <button key={button.label} type="button" onClick={() => handleToolbarClick(button)} className={BUTTON_CLASS}>
              {button.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/70 bg-white/70 p-3 shadow-inner sm:grid-cols-2 lg:grid-cols-6">
        <label className="space-y-1 text-xs font-semibold text-midnight/70">
          <span>Image width</span>
          <select
            value={imageSize}
            onChange={(event) => setImageSize(event.target.value as ImageSize)}
            className="w-full rounded-lg border border-midnight/10 bg-white px-3 py-2 text-sm text-midnight shadow-inner"
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="full">Full width</option>
          </select>
        </label>

        <label className="space-y-1 text-xs font-semibold text-midnight/70 sm:col-span-1 lg:col-span-2">
          <span>Alt text (optional)</span>
          <input
            value={imageAlt}
            onChange={(event) => setImageAlt(event.target.value)}
            className="w-full rounded-lg border border-midnight/10 bg-white px-3 py-2 text-sm text-midnight shadow-inner"
            placeholder="Describe the image"
          />
        </label>

        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <label className={`${BUTTON_CLASS} w-full cursor-pointer text-center`}>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadImage(file);
                  event.target.value = '';
                }
              }}
              disabled={uploadStatus === 'uploading'}
            />
            {uploadStatus === 'uploading'
              ? 'Uploading…'
              : uploadStatus === 'success'
                ? 'Uploaded ✓'
                : uploadStatus === 'error'
                  ? 'Upload failed'
                  : 'Insert image'}
          </label>
        </div>

        <div className="flex items-end lg:col-span-1">
          <button type="button" onClick={onRemoveLastImage} className={BUTTON_CLASS} disabled={!hasAnyImages}>
            Remove last image
          </button>
        </div>

        <div className="flex items-end gap-2 lg:col-span-2">
          <input
            value={removeUrl}
            onChange={(e) => setRemoveUrl(e.target.value)}
            className="w-full rounded-lg border border-midnight/10 bg-white px-3 py-2 text-xs text-midnight shadow-inner"
            placeholder="Paste exact image URL to remove"
          />
          <button type="button" onClick={onRemoveByUrl} className={BUTTON_CLASS} disabled={!removeUrl.trim()}>
            Remove
          </button>
        </div>
      </div>

      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}

      <div className="grid grid-cols-1 gap-4 items-start lg:grid-cols-2">
        {/* LEFT: Preview with slider */}
        <div className="flex w-full flex-col rounded-xl border border-white/60 bg-white/70 p-4 shadow-inner">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-midnight/70">Preview</p>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-midnight/60">Width: {previewWidth}px</span>
              <input
                type="range"
                min={360}
                max={1200}
                step={10}
                value={previewWidth}
                onChange={(e) => setPreviewWidth(Number(e.target.value))}
                className="w-52"
              />
            </div>
          </div>

          <div className="w-full overflow-auto">
            <div className="mx-auto rounded-lg border border-midnight/10 bg-white p-4 shadow-inner" style={{ width: `${previewWidth}px`, maxWidth: '100%' }}>
              <div className="prose max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({ src, alt }) => {
                      const raw = (src || '').toString();
                      const size = getSizeFromUrl(raw);
                      // keep URL as-is so the image loads (no more “broken image”)
                      // eslint-disable-next-line @next/next/no-img-element
                      return <img src={raw} alt={alt || ''} style={getImageStyle(size)} />;
                    },
                  }}
                >
                  {value || '*Start writing to see the preview...*'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Editor */}
        <textarea
          className="w-full min-w-0 rounded-xl border border-midnight/10 bg-white px-3 py-2 text-sm leading-6 shadow-inner min-h-[620px]"
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Write your markdown here..."
        />
      </div>

      <p className="text-[11px] text-midnight/60">
        Images store size as a URL param, e.g. <code>?__sz=sm</code>.
      </p>
    </div>
  );
}
