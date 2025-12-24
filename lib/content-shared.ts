export type PostFrontmatter = {
  title: string;
  date: string;
  excerpt: string;
  tags?: string[];
  slug: string;
  coverImage?: string;
};

export type Post = PostFrontmatter & {
  content: string;
  readingMinutes: number;
  headings: { depth: number; value: string; slug: string }[];
};

export type Book = {
  id: string;
  title: string;
  author: string;
  link: string;
  image?: string;
  note?: string;
};

export type SiteSettings = {
  blogOrder: string[];
  bookOrder: string[];
};

export function applyPostOrdering(posts: Post[], order: string[]): Post[] {
  const map = new Map(posts.map((p) => [p.slug, p] as const));
  const ordered: Post[] = [];
  for (const slug of order) {
    const post = map.get(slug);
    if (post) {
      ordered.push(post);
      map.delete(slug);
    }
  }
  const remaining = Array.from(map.values()).sort((a, b) => (a.date > b.date ? -1 : 1));
  return [...ordered, ...remaining];
}
