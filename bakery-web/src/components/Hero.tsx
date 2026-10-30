import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ShoppingBag, Sparkles, Instagram } from 'lucide-react';

function WhatsAppIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29" />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream pt-[76px]">
      <div className="pointer-events-none absolute -left-36 top-20 h-96 w-96 rounded-full bg-caramel/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[32rem] w-[32rem] rounded-full bg-rose-gold/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-3 pb-7 pt-3 sm:px-6 sm:pb-12 sm:pt-6 lg:min-h-[calc(100svh-76px)] lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:py-14">
        <div className="relative order-2 z-10 px-4 pb-5 pt-2 sm:px-5 lg:order-1 lg:px-0 lg:py-10">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-caramel/20 bg-white/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.19em] text-caramel-dark shadow-sm sm:text-xs">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            A little joy, baked in
          </p>
          <h1 className="max-w-2xl font-serif text-[2.75rem] font-medium leading-[1.02] tracking-tight text-espresso sm:text-6xl lg:text-[4.5rem] xl:text-[5.3rem]">
            Make room for
            <span className="mt-1 block italic text-caramel-dark">something sweet.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-charcoal-light sm:mt-7 sm:text-lg sm:leading-8">
            A thoughtful little menu of cakes, pastries, cookies and drinks. Find a favourite, see the price and make it yours.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:mt-9">
            <Link
              href="#menu"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-espresso px-7 text-sm font-semibold text-white shadow-xl shadow-espresso/20 transition-all hover:-translate-y-0.5 hover:bg-espresso-light active:translate-y-0"
            >
              Explore the menu
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="#about" className="inline-flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-espresso transition-colors hover:text-caramel-dark">
              How ordering works
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Social & WhatsApp Direct Contact */}
          <div className="mt-5 flex items-center gap-2.5 flex-wrap">
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
              <span>WhatsApp Inquiry</span>
            </a>

            <a
              href="https://instagram.com/crumblcloud"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold bg-rose-500/10 text-rose-800 border border-rose-500/30 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <Instagram className="w-3.5 h-3.5 text-rose-600 group-hover:text-white" />
              <span>Instagram @crumblcloud</span>
            </a>
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-espresso/10 pt-5 sm:mt-10 sm:pt-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-caramel/10 text-caramel-dark">
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-xs leading-relaxed text-muted sm:text-sm">
              Browse at your pace. Your order request is reviewed before it is confirmed.
            </p>
          </div>
        </div>

        <div className="relative order-1 min-h-[360px] overflow-hidden rounded-[2rem] bg-cream-dark shadow-2xl shadow-espresso/15 sm:min-h-[520px] lg:order-2 lg:min-h-[610px] lg:rounded-[2.5rem]">
          <Image
            src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1400&q=88"
            alt="Chocolate layer cake decorated with berries"
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 55vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso/45 via-transparent to-espresso/5" />
          <div className="absolute left-4 top-4 rounded-2xl border border-white/50 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md sm:left-6 sm:top-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-caramel-dark">Sample Cloud Bakery / Cloud Kitchen</p>
            <p className="mt-1 font-serif text-lg text-espresso">Your sweet little pause</p>
          </div>
          <div className="absolute bottom-4 right-4 max-w-[245px] rounded-2xl bg-cream/95 p-4 shadow-xl backdrop-blur-md sm:bottom-6 sm:right-6 sm:p-5">
            <p className="font-serif text-xl text-espresso">Something for every craving.</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Browse cakes, cookies, pastries and more.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
