import { AdminLogin } from '../../components/AdminLogin';
import { AdminPanel } from '../../components/AdminPanel';
import { HomeLogoLink } from '../../components/HomeLogoLink';
import { getAllPosts, getBooks } from '../../lib/content';
import { getSessionFromCookies } from '../../lib/auth';

export default async function AdminPage() {
  const session = getSessionFromCookies();
  if (!session) {
    return (
      <>
        <HomeLogoLink className="fixed right-6 top-6 z-10" />
        <main className="min-h-screen flex items-center justify-center">
          <AdminLogin />
        </main>
      </>
    );
  }

  const [posts, books] = await Promise.all([getAllPosts(), getBooks()]);
  return (
    <main className="space-y-8">
      <AdminPanel posts={posts} books={books} />
    </main>
  );
}
