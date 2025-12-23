'use client';

import { useEffect, useState } from 'react';

export function ContactSection() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === '#contact') {
        setIsOpen(true);
      }
    };

    const handleOpen = () => setIsOpen(true);

    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    window.addEventListener('open-contact', handleOpen);

    return () => {
      window.removeEventListener('hashchange', openFromHash);
      window.removeEventListener('open-contact', handleOpen);
    };
  }, []);

  return (
    <section id="contact" className="card p-6 md:p-10 space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-midnight/60">Reach Out</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-3xl text-midnight">Contact</h2>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-midnight/20 px-4 py-2 text-sm font-semibold text-midnight hover:bg-white/70"
          >
            {isOpen ? 'Hide form' : 'Open form'}
          </button>
        </div>
        <p className="text-midnight/80 leading-relaxed">
          Share what you need support with and we will guide you toward the right next step.
        </p>
        <p className="text-sm text-midnight/70">
          Email us directly at{' '}
          <a className="font-semibold text-midnight hover:text-midnight/80" href="mailto:psynverse@gmail.com">
            psynverse@gmail.com
          </a>
        </p>
      </div>
      {isOpen ? (
        <form action="mailto:psynverse@gmail.com" method="post" encType="text/plain" className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="contact-name" className="text-sm font-semibold text-midnight">
              Full Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              placeholder="Your full name"
              className="peer w-full rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-sm text-midnight placeholder:text-midnight/50 focus:outline-none focus:ring-2 focus:ring-midnight/30"
            />
            <p className="text-xs text-rose-600 opacity-0 transition peer-invalid:opacity-100 peer-placeholder-shown:opacity-0">
              Please enter your full name.
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="contact-email" className="text-sm font-semibold text-midnight">
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="peer w-full rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-sm text-midnight placeholder:text-midnight/50 focus:outline-none focus:ring-2 focus:ring-midnight/30"
            />
            <p className="text-xs text-rose-600 opacity-0 transition peer-invalid:opacity-100 peer-placeholder-shown:opacity-0">
              Please enter a valid email address.
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="contact-subject" className="text-sm font-semibold text-midnight">
              Subject
            </label>
            <input
              id="contact-subject"
              name="subject"
              type="text"
              required
              placeholder="How can we help?"
              className="peer w-full rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-sm text-midnight placeholder:text-midnight/50 focus:outline-none focus:ring-2 focus:ring-midnight/30"
            />
            <p className="text-xs text-rose-600 opacity-0 transition peer-invalid:opacity-100 peer-placeholder-shown:opacity-0">
              Please add a subject line.
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="contact-message" className="text-sm font-semibold text-midnight">
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              rows={5}
              placeholder="Write your message here."
              className="peer w-full rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-sm text-midnight placeholder:text-midnight/50 focus:outline-none focus:ring-2 focus:ring-midnight/30"
            />
            <p className="text-xs text-rose-600 opacity-0 transition peer-invalid:opacity-100 peer-placeholder-shown:opacity-0">
              Please share a short message.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-midnight px-6 py-3 text-sm font-semibold text-white hover:bg-midnight/90 md:w-auto"
          >
            Send Message
          </button>
        </form>
      ) : (
        <p className="text-sm text-midnight/70">Click “Open form” to send a message.</p>
      )}
    </section>
  );
}
