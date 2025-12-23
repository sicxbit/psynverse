'use client';

import type React from 'react';

export function BookSessionButton() {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.dispatchEvent(new Event('open-contact'));
    const contactSection = document.getElementById('contact');
    contactSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#contact');
  };

  return (
    <a
      href="#contact"
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-full bg-midnight text-white px-5 py-2 font-semibold hover:bg-midnight/90"
    >
      Book a Session →
    </a>
  );
}
