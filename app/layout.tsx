import type { Metadata } from 'next';
import '@/styles/globals.css';
import { sans, serif } from '../lib/fonts';
import { BRAND } from '../lib/constants';

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} • ${BRAND.tagline}`,
    template: `%s • ${BRAND.name}`,
  },
  description: `${BRAND.author} — ${BRAND.credentials}`,

  // This is OPTIONAL because app/favicon.ico is auto-detected,
  // but keeping it explicit is fine.
  icons: {
    icon: '/favicon.ico',
  },

  openGraph: {
    title: BRAND.name,
    description: BRAND.tagline,
    url: BRAND.siteUrl,
    siteName: BRAND.name,
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-gradient-to-b from-blush via-mist to-white">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          {children}
        </div>
      </body>
    </html>
  );
}
