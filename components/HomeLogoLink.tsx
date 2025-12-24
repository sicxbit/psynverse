import Image from 'next/image';
import Link from 'next/link';
import logo from '../logo.png';

type HomeLogoLinkProps = {
  className?: string;
};

export function HomeLogoLink({ className = '' }: HomeLogoLinkProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-white/70 bg-white/60 backdrop-blur ${className}`}
    >
      <span className="relative h-7 w-7 overflow-hidden rounded-lg bg-white/90 shadow-soft ring-1 ring-white/70">
        <Image src={logo} alt="Psynverse logo" fill className="object-contain" sizes="28px" />
      </span>
      <span>Home</span>
    </Link>
  );
}
