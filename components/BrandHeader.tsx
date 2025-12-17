import { BRAND } from '../lib/constants';

export function BrandHeader() {
  return (
    <header className="flex items-center justify-between gap-4 mb-10">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-midnight/80 to-midnight flex items-center justify-center text-white font-serif text-xl shadow-soft">
        P
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-midnight/10 via-midnight/30 to-midnight/10" />
      <div className="text-right">
        <p className="font-serif text-2xl md:text-3xl text-midnight">{BRAND.name}</p>
        <p className="text-sm text-midnight/70">{BRAND.tagline}</p>
      </div>
    </header>
  );
}