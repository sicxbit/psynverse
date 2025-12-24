import Image from 'next/image';
import Link from 'next/link';
import { BrandHeader } from '../components/BrandHeader';
import { PostCard } from '../components/PostCard';
import { BookCard } from '../components/BookCard';
import { BookSessionButton } from '../components/BookSessionButton';
import { ContactSection } from '../components/ContactSection';
import { BRAND } from '../lib/constants';
import { getAllPosts, getBooks } from '../lib/content';

export default async function HomePage() {
  const posts = await getAllPosts();
  const books = await getBooks();
  const services = [
    {
      title: 'Counciling Service',
      description: 'Personalized guidance sessions that focus on clarity, resilience, and steady progress.',
    },
    {
      title: 'Couples Therapy',
      description: 'Supportive conversations that strengthen communication and deepen mutual understanding.',
    },
    {
      title: 'Family and Maritial Counciling',
      description: 'Collaborative family sessions to rebuild trust and foster healthier dynamics.',
    },
    {
      title: 'Psychotherapy',
      description: 'Evidence-informed care to explore patterns, heal gently, and build emotional balance.',
    },
    {
      title: 'Human Workshops and Classes',
      description: 'Interactive learning experiences designed to cultivate insight and lasting skills.',
    },
  ];

  const aestheticImages = [
    { src: '/aesthetics/image1.jpeg', alt: 'Soft, calming aesthetic scene with natural textures.' },
    { src: '/aesthetics/image2.jpeg', alt: 'Serene, airy aesthetic with gentle light and greenery.' },
    { src: '/aesthetics/image3.png', alt: 'Minimal, soothing aesthetic featuring neutral tones.' },
    { src: '/aesthetics/image4.png', alt: 'Bright, tranquil aesthetic with organic shapes.' },
  ];

  return (
    <main className="space-y-10">
      <BrandHeader />

      <section className="card p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-midnight/60">About Psynverse</p>
          <h1 className="font-serif text-3xl md:text-4xl text-midnight">{BRAND.name}</h1>
          <p className="text-midnight/80 leading-relaxed">
            Psynverse is a calm corner of the web where introspection meets psychology. We share reflective journal
            entries, mindful prompts, and curated resources that make space for healing and steady self-understanding.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full bg-midnight text-white px-5 py-2 font-semibold hover:bg-midnight/90"
          >
            Read the Journal →
          </Link>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          {aestheticImages.map((image) => (
            <div
              key={image.src}
              className="relative overflow-hidden rounded-2xl border border-white/80 bg-white/60"
              style={{ aspectRatio: '4 / 3' }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 200px, (min-width: 768px) 220px, 50vw"
                className="object-cover"
                priority
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-midnight">Services</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article key={service.title} className="card p-6 space-y-3">
              <h3 className="font-serif text-xl text-midnight">{service.title}</h3>
              <p className="text-sm text-midnight/80 leading-relaxed">{service.description}</p>
            </article>
          ))}
        </div>
        <div>
          <BookSessionButton />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-midnight">Latest journal entries</h2>
          <Link href="/blog" className="text-sm font-semibold">See all</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {posts.slice(0, 3).map((post, idx) => (
            <PostCard key={post.slug} post={post} index={idx} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-midnight">Featured books & resources</h2>
          <Link href="/books" className="text-sm font-semibold">All books</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {books.slice(0, 3).map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      <section className="card p-6 md:p-10 space-y-4 md:space-y-0 md:flex md:items-center md:gap-8">
        <div className="w-full md:w-1/3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sage/40 border border-white/80">
            <Image
              src="/author/fidha.png"
              alt="Fidha portrait"
              fill
              sizes="(min-width: 768px) 320px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
        <div className="space-y-4 md:w-2/3">
          <p className="text-sm uppercase tracking-[0.3em] text-midnight/60">About Fidha</p>
          <h2 className="font-serif text-3xl text-midnight">
            {BRAND.author} <span className="text-midnight/70">— {BRAND.credentials}</span>
          </h2>
          <p className="text-midnight/80 leading-relaxed">
            Fidha Nashim is a psychology practitioner and social worker who blends compassionate listening with practical
            tools. Her work is rooted in a postgraduate focus on psychiatric social work, a diploma in counselling
            psychology, and a KAPS Professional Licence.
          </p>
        </div>
      </section>

      <ContactSection />
      <section className="card p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-midnight/60">Certifications</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm text-midnight/70">
          <div className="rounded-xl bg-white/70 py-3">MSc Psychology</div>
          <div className="rounded-xl bg-white/70 py-3">Psychiatric Social Work (PG)</div>
          <div className="rounded-xl bg-white/70 py-3">Diploma in Counselling Psychology</div>
          <div className="rounded-xl bg-white/70 py-3">KAPS Professional Licence</div>
        </div>
      </section>

    </main>
  );
}
