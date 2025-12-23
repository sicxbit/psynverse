import Image from 'next/image';
import { BRAND } from '../lib/constants';
import logo from '../logo.png';

export function BrandHeader() {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-2xl bg-white/90 shadow-soft ring-1 ring-white/70 flex items-center justify-center overflow-hidden transition-transform duration-300 ease-out hover:scale-105">
          <Image src={logo} alt={`${BRAND.name} logo`} className="h-full w-full object-contain" priority />
        </div>
        <div className="md:hidden">
          <p className="font-serif text-2xl text-midnight">{BRAND.name}</p>
          <p className="text-sm text-midnight/70">{BRAND.tagline}</p>
        </div>
      </div>
      <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-midnight/10 via-midnight/30 to-midnight/10" />
      <div className="hidden md:block text-right">
        <p className="font-serif text-2xl md:text-3xl text-midnight">{BRAND.name}</p>
        <p className="text-sm text-midnight/70">{BRAND.tagline}</p>
      </div>
    </header>
  );
}
