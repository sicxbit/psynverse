import type { Metadata } from 'next';
import '@/styles/globals.css';
import { sans, serif } from '../lib/fonts';
import { BRAND } from '../lib/constants';

export const metadata: Metadata = {
  title: `${BRAND.name} • ${BRAND.tagline}`,
  description: `${BRAND.author} — ${BRAND.credentials}`,
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: BRAND.name,
    description: BRAND.tagline,
    url: BRAND.siteUrl,
    siteName: BRAND.name,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-gradient-to-b from-blush via-mist to-white">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">{children}</div>
      </body>
    </html>
  );
}
