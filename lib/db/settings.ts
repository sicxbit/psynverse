import { unstable_noStore as noStore } from 'next/cache';
import { getDb } from '../mongo';

const SETTINGS_ID = 'site';

type SettingsDoc = {
  _id: typeof SETTINGS_ID;
  blogOrder: string[];
  bookOrder: string[];
};

const DEFAULT_SETTINGS: SettingsDoc = {
  _id: SETTINGS_ID,
  blogOrder: [],
  bookOrder: [],
};

export async function getSettings(): Promise<SettingsDoc> {
  noStore();

  const db = await getDb();
  const doc = await db.collection<SettingsDoc>('settings').findOne({ _id: SETTINGS_ID });
  if (!doc) {
    return DEFAULT_SETTINGS;
  }
  return {
    _id: SETTINGS_ID,
    blogOrder: doc.blogOrder || [],
    bookOrder: doc.bookOrder || [],
  };
}

export async function setBlogOrder(blogOrder: string[]) {
  const db = await getDb();
  await db
    .collection<SettingsDoc>('settings')
    .updateOne({ _id: SETTINGS_ID }, { $set: { blogOrder } }, { upsert: true });
  return blogOrder;
}

export async function setBookOrder(bookOrder: string[]) {
  const db = await getDb();
  await db
    .collection<SettingsDoc>('settings')
    .updateOne({ _id: SETTINGS_ID }, { $set: { bookOrder } }, { upsert: true });
  return bookOrder;
}
