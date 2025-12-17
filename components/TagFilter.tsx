'use client';

interface TagFilterProps {
  tags: string[];
  active: string | null;
  onChange: (tag: string | null) => void;
}

export function TagFilter({ tags, active, onChange }: TagFilterProps) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1 rounded-full text-sm border ${active === null ? 'bg-midnight text-white' : 'bg-white/70'}`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onChange(active === tag ? null : tag)}
          className={`px-3 py-1 rounded-full text-sm border transition ${
            active === tag ? 'bg-midnight text-white border-midnight' : 'bg-white/70 border-midnight/10'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}