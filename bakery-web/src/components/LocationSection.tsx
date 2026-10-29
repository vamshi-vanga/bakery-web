import Link from 'next/link';
import { ArrowRight, CalendarClock, CakeSlice, Leaf } from 'lucide-react';

const questions = [
  {
    icon: CalendarClock,
    number: '01',
    title: 'Timing & delivery',
    description: 'Share your preferred date, time and area in your order note so the bakery can check availability.',
  },
  {
    icon: CakeSlice,
    number: '02',
    title: 'A cake for the occasion',
    description: 'Include your date, serving size and flavour idea for the bakery to review with you.',
  },
  {
    icon: Leaf,
    number: '03',
    title: 'Ingredients & allergens',
    description: 'Ask about ingredients before ordering. Add your question to the notes for a response.',
  },
];

export default function LocationSection() {
  return (
    <section id="location" className="scroll-mt-20 bg-[#f6efe6] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-espresso px-5 py-10 text-white sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full border-[60px] border-white/[0.04]" />
          <div className="pointer-events-none absolute -bottom-44 -left-28 h-96 w-96 rounded-full bg-caramel/15 blur-3xl" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-caramel-light">
                <span className="h-px w-7 bg-caramel-light" />
                Here to help
              </p>
              <h2 className="font-serif text-3xl font-medium leading-tight sm:text-4xl lg:text-[2.75rem]">Planning something sweet?</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/65">
                Tell us what you have in mind with your order request. The bakery can follow up about timing, custom cakes or ingredients.
              </p>
              <Link href="#menu" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-caramel px-5 text-sm font-semibold text-white transition-colors hover:bg-caramel-dark">
                Browse the menu
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {questions.map(({ icon: Icon, number, title, description }) => (
                <article key={number} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur sm:p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-caramel/15 text-caramel-light">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-[9px] font-bold tracking-[0.18em] text-white/35">{number}</span>
                  </div>
                  <h3 className="font-serif text-lg text-white">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/55">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
