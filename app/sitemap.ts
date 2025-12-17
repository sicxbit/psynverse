import { MetadataRoute } from 'next';
import { getSiteMapUrls } from '../lib/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return await getSiteMapUrls();
}