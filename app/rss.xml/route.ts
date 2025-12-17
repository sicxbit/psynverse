import { NextResponse } from 'next/server';
import { getMetadataForRSS } from '../../lib/content';
import { BRAND } from '../../lib/constants';

export async function GET() {
  const items = await getMetadataForRSS();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>${BRAND.name}</title>
      <link>${BRAND.siteUrl}</link>
      <description>${BRAND.tagline}</description>
      ${items
        .map(
          (item) => `
            <item>
              <title><![CDATA[${item.title}]]></title>
              <link>${item.link}</link>
              <description><![CDATA[${item.description}]]></description>
              <pubDate>${item.date}</pubDate>
            </item>`
        )
        .join('')}
    </channel>
  </rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}