'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MessageCircle, Search, ShoppingBag } from 'lucide-react';

export default function AboutSection() {
  const steps = [
    {
      icon: Search,
      number: '01',
      title: 'Take a look around',
      description: 'Browse the menu, compare sizes and see prices before you decide.',
    },
    {
      icon: ShoppingBag,
      number: '02',
      title: 'Build your little box',
      description: 'Add your picks to the bag and adjust quantities to suit.',
    },
    {
      icon: MessageCircle,
      number: '03',
      title: 'Send your request',
      description: 'Your request appears in the bakery’s order panel so the team can confirm availability and details with you.',
    },
  ];

  return (
    <section id="about" className="scroll-mt-20 overflow-hidden bg-cream py-16 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-cream-dark shadow-2xl shadow-espresso/10 sm:aspect-[5/4]">
            <Image
              src="https://images.unsplash.com/photo-1556217477-d325251ece38?w=1100&q=85"
              alt="Pastries arranged on a bakery work surface"
              fill
              sizes="(max-width: 1023px) 100vw, 48vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-espresso/45 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-6 sm:left-6 sm:right-6">
              <div className="rounded-2xl bg-cream/95 px-4 py-3 shadow-lg backdrop-blur">
                <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-caramel-dark">A sweet thing, your way</p>
                <p className="mt-1 font-serif text-lg text-espresso sm:text-xl">Choose what feels right.</p>
              </div>
              <span className="hidden h-12 w-12 items-center justify-center rounded-full bg-caramel text-white sm:flex">
                <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </div>
          <div className="absolute -bottom-5 -right-2 hidden h-20 w-20 rounded-full border-[10px] border-cream bg-caramel/15 sm:block" />
        </div>

        <div>
          <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-caramel-dark">
            <span className="h-px w-7 bg-caramel" />
            A simple way to order
          </p>
          <h2 className="max-w-xl font-serif text-4xl font-medium leading-[1.08] tracking-tight text-espresso sm:text-5xl">
            The good part starts with choosing.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-charcoal-light sm:text-base">
            Browse, choose your bakes and send an order request from your bag. Add a note for timing, delivery or ingredient questions so the bakery can review it with you.
          </p>

          <div className="mt-7 space-y-3 sm:mt-9">
            {steps.map(({ icon: Icon, number, title, description }) => (
              <article key={number} className="group grid grid-cols-[42px_1fr] gap-4 rounded-2xl border border-espresso/5 bg-white/70 p-4 transition-colors hover:bg-white sm:grid-cols-[48px_1fr] sm:p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-caramel/10 text-caramel-dark transition-colors group-hover:bg-espresso group-hover:text-caramel-light sm:h-12 sm:w-12">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold tracking-[0.18em] text-caramel-dark">STEP {number}</span>
                    <h3 className="font-semibold text-espresso">{title}</h3>
                  </div>
                  <p className="text-xs leading-5 text-muted sm:text-sm sm:leading-6">{description}</p>
                </div>
              </article>
            ))}
          </div>

          <Link href="#menu" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-espresso transition-colors hover:text-caramel-dark">
            Find your next favourite
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
