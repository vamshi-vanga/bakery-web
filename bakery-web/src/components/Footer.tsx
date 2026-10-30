import Link from 'next/link';
import { ArrowUpRight, Cookie } from 'lucide-react';

const footerLinks = [
  { href: '#menu', label: 'The Menu' },
  { href: '#about', label: 'How to order' },
  { href: '#location', label: 'Order support' },
];

export default function Footer() {
  return (
    <footer className="bg-[#21130e] text-white">
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-12 sm:px-6 sm:pt-16">
        <div className="grid gap-10 border-b border-white/10 pb-10 sm:grid-cols-[1.2fr_0.8fr_1fr] sm:gap-12 sm:pb-12">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Sample Cloud Bakery / Cloud Kitchen home">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-caramel-light">
                <Cookie className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-serif text-xl font-semibold text-white">Sample Cloud Bakery</span>
                <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.22em] text-caramel-light">Cloud Kitchen</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/55">
              A little something sweet for your everyday and special moments.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Find your way</h2>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-caramel-light">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:justify-self-end">
            <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">A note before you order</h2>
            <p className="max-w-xs text-sm leading-6 text-white/55">
              Add delivery, timing, custom cake or ingredient questions to your order note for the bakery to review.
            </p>
            <Link href="#location" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-caramel-light transition-colors hover:text-white">
              Order support
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-2 pt-5 text-xs text-white/35 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Sample Cloud Bakery / Cloud Kitchen</p>
          <p>Thank you for stopping by.</p>
        </div>
      </div>
    </footer>
  );
}
