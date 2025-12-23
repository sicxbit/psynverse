import Image from 'next/image';
import { BRAND } from '../lib/constants';
import logo from '../logo.svg';

export function BrandHeader() {
  return (
    <header className="flex items-center justify-between gap-4 mb-10">
      <div className="h-12 w-12 rounded-full bg-white/80 shadow-soft flex items-center justify-center overflow-hidden">
        <Image src={logo} alt={`${BRAND.name} logo`} className="h-full w-full object-cover" priority />
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-midnight/10 via-midnight/30 to-midnight/10" />
      <div className="text-right">
        <p className="font-serif text-2xl md:text-3xl text-midnight">{BRAND.name}</p>
        <p className="text-sm text-midnight/70">{BRAND.tagline}</p>
      </div>
    </header>
  );
}
