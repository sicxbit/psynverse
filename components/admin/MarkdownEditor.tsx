'use client';

import { useRef, useState } from 'react';
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

const STATUS_RESET_MS = 1500;

const BUTTON_CLASS =
  'rounded-lg border px-3 py-2 text-xs font-semibold text-midnight hover:bg-white/80 disabled:opacity-60 disabled:cursor-not-allowed';

const escapeForRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function MarkdownEditor({ value, onChange, uploadFolder = 'blog' }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState('');

  const resetUploadStatus = (status: UploadStatus) => {
    setUploadStatus(status);
    if (status === 'success' || status === 'error') {
      setTimeout(() => setUploadStatus('idle'), STATUS_RESET_MS);
    }
  };

  const modifyValue = (
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
  };

  const wrapSelection = (prefix: string, suffix: string, placeholder: string) => {
    modifyValue((currentValue, selection) => {
      const selectedText = currentValue.slice(selection.selectionStart, selection.selectionEnd) || placeholder;
      const wrapped = `${prefix}${selectedText}${suffix}`;
      const newValue =
        currentValue.slice(0, selection.selectionStart) + wrapped + currentValue.slice(selection.selectionEnd);
      const start = selection.selectionStart + prefix.length;
      const end = start + selectedText.length;
      return { text: newValue, selectionStart: start, selectionEnd: end };
    });
  };

  const prefixLines = (prefix: string, placeholder: string, numbered = false) => {
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
  };

  const applyLink = () => {
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
  };

  const insertImage = (url: string) => {
    modifyValue((currentValue, selection) => {
      const altText = 'alt text';
      const imageMarkdown = `![${altText}](${url})`;
      const newValue =
        currentValue.slice(0, selection.selectionStart) + imageMarkdown + currentValue.slice(selection.selectionEnd);
      const altStart = selection.selectionStart + 2;
      const altEnd = altStart + altText.length;
      return { text: newValue, selectionStart: altStart, selectionEnd: altEnd };
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

      insertImage(secureUrl);
      resetUploadStatus('success');
    } catch (error: any) {
      resetUploadStatus('error');
      setUploadError(error?.message || 'Failed to upload image.');
    }
  };

  const toolbarButtons = [
    { label: 'Bold', action: () => wrapSelection('**', '**', 'bold text') },
    { label: 'Italic', action: () => wrapSelection('*', '*', 'italic text') },
    { label: 'H2', action: () => prefixLines('## ', 'Heading') },
    { label: 'H3', action: () => prefixLines('### ', 'Heading') },
    { label: 'Bullets', action: () => prefixLines('- ', 'List item') },
    { label: 'Numbers', action: () => prefixLines('', 'List item', true) },
    { label: 'Link', action: applyLink },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-midnight/70">Content (Markdown)</p>
        <div className="flex flex-wrap gap-2">
          {toolbarButtons.map((button) => (
            <button key={button.label} type="button" onClick={button.action} className={BUTTON_CLASS}>
              {button.label}
            </button>
          ))}
          <label className={`${BUTTON_CLASS} cursor-pointer`}>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-midnight/10 bg-white px-3 py-2 text-sm leading-6 shadow-inner"
          rows={12}
          placeholder="Write your markdown here..."
        />

        <div className="rounded-xl border border-white/60 bg-white/70 p-3 shadow-inner">
          <p className="mb-2 text-xs font-semibold text-midnight/70">Live preview</p>
          <div className="prose max-h-[360px] max-w-none overflow-auto pr-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || '*Start writing to see the preview...*'}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
