'use client';

import { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
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

type ImageAlignment = 'left' | 'center' | 'right';
type ImageSize = 'w-sm' | 'w-md' | 'w-lg' | 'w-full';

const STATUS_RESET_MS = 1500;

const BUTTON_CLASS =
  'rounded-lg border px-3 py-2 text-xs font-semibold text-midnight hover:bg-white/80 disabled:opacity-60 disabled:cursor-not-allowed';

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

export function MarkdownEditor({ value, onChange, uploadFolder = 'blog' }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState('');
  const [imageAlignment, setImageAlignment] = useState<ImageAlignment>('center');
  const [imageSize, setImageSize] = useState<ImageSize>('w-md');
  const [imageAlt, setImageAlt] = useState('');

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
            if (numbered) {
              return `${index + 1}. ${cleanLine || placeholder}`;
            }
            return `${prefix}${cleanLine || placeholder}`;
          })
          .join('\n');
        const newValue =
          currentValue.slice(0, selection.selectionStart) + prefixed + currentValue.slice(selection.selectionEnd);
        const start = selection.selectionStart;
        const end = start + prefixed.length;
        return { text: newValue, selectionStart: start, selectionEnd: end };
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

  const insertImage = (url: string, altText: string, alignment: ImageAlignment, size: ImageSize) => {
    modifyValue((currentValue, selection) => {
      const safeAltText = (altText.trim() || 'Image').replace(/"/g, '&quot;');
      const figure = `\n<figure class="blog-image ${alignment} ${size}">\n  <img src="${url}" alt="${safeAltText}" />\n</figure>\n`;
      const newValue =
        currentValue.slice(0, selection.selectionStart) + figure + currentValue.slice(selection.selectionEnd);
      const cursor = selection.selectionStart + figure.length;
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

      insertImage(secureUrl, imageAlt, imageAlignment, imageSize);
      resetUploadStatus('success');
    } catch (error: any) {
      resetUploadStatus('error');
      setUploadError(error?.message || 'Failed to upload image.');
    }
  };

  const handleToolbarClick = useCallback(
    (button: ToolbarButton) => {
      if (button.type === 'wrap') {
        wrapSelection(button.prefix, button.suffix, button.placeholder);
        return;
      }

      if (button.type === 'prefix') {
        prefixLines(button.prefix, button.placeholder, button.numbered);
        return;
      }

      applyLink();
    },
    [applyLink, prefixLines, wrapSelection],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-midnight/70">Content (Markdown)</p>
        <div className="flex flex-wrap gap-2">
          {TOOLBAR_BUTTONS.map((button) => (
            <button
              key={button.label}
              type="button"
              onClick={() => handleToolbarClick(button)}
              className={BUTTON_CLASS}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/70 bg-white/70 p-3 shadow-inner sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs font-semibold text-midnight/70">
          <span>Image alignment</span>
          <select
            value={imageAlignment}
            onChange={(event) => setImageAlignment(event.target.value as ImageAlignment)}
            className="w-full rounded-lg border border-midnight/10 bg-white px-3 py-2 text-sm text-midnight shadow-inner"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-midnight/70">
          <span>Image width</span>
          <select
            value={imageSize}
            onChange={(event) => setImageSize(event.target.value as ImageSize)}
            className="w-full rounded-lg border border-midnight/10 bg-white px-3 py-2 text-sm text-midnight shadow-inner"
          >
            <option value="w-sm">Small</option>
            <option value="w-md">Medium</option>
            <option value="w-lg">Large</option>
            <option value="w-full">Full width</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-midnight/70 sm:col-span-2 lg:col-span-1">
          <span>Alt text (optional)</span>
          <input
            value={imageAlt}
            onChange={(event) => setImageAlt(event.target.value)}
            className="w-full rounded-lg border border-midnight/10 bg-white px-3 py-2 text-sm text-midnight shadow-inner"
            placeholder="Describe the image"
          />
        </label>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <label className={`${BUTTON_CLASS} w-full text-center cursor-pointer`}>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  uploadImage(file);
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
      </div>

      {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}

      <div className="grid gap-4 items-start md:grid-cols-[0.9fr_1.6fr] xl:grid-cols-[0.85fr_1.85fr]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-midnight/10 bg-white px-3 py-2 text-sm leading-6 shadow-inner"
          rows={14}
          placeholder="Write your markdown here..."
        />

        <div className="flex h-full min-h-[360px] flex-col rounded-xl border border-white/60 bg-white/70 p-4 shadow-inner md:min-h-[520px]">
          <p className="mb-2 text-xs font-semibold text-midnight/70">Live preview</p>
          <div className="prose max-h-[620px] md:max-h-[80vh] max-w-none grow overflow-auto pr-2 md:min-h-[320px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {value || '*Start writing to see the preview...*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
