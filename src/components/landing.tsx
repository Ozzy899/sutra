"use client";

import { t } from "@/components/copy";
import { ProductTour } from "@/components/product-tour";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LANDING_TOUR } from "@/lib/tour";
import { cn } from "@/lib/utils";
import { ArrowRight, Sunrise } from "lucide-react";
import Link from "next/link";

const partners = [
  ["x.ai / Grok", "your summary"],
  ["Exa", "roles"],
  ["Firecrawl", "listing text"],
  ["Daytona", "fit + proof"],
];

export function Landing() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dawn-grid opacity-40" />
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-[var(--dawn)]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-[-8rem] h-80 w-80 rounded-full bg-[var(--river)]/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[var(--zap)]/10 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Sunrise className="size-5 text-[var(--dawn)]" />
          <span className="font-heading text-xl tracking-tight">{t.brand}</span>
        </div>
        <div className="flex items-center gap-2">
          <ProductTour id="landing" steps={LANDING_TOUR} />
          <Link href="/studio" className={cn(buttonVariants({ size: "sm" }))}>
            {t.studio}
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 md:pt-16" data-tour="landing-hero">
        <h1 className="font-heading max-w-3xl text-4xl leading-[1.05] tracking-tight text-balance sm:text-6xl md:text-7xl">
          {t.hero}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {t.sub}
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {t.sub2}
        </p>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed md:text-xl">{t.sub3}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/studio?run=ana"
            className={cn(buttonVariants({ size: "lg" }))}
            data-tour="landing-demo"
          >
            {t.cta}
            <ArrowRight data-icon="inline-end" />
          </Link>
          <Link
            href="/studio?setup=1"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            data-tour="landing-own"
          >
            {t.ctaOwn}
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Sample uses Ana — NestJS, Belgrade, August layoff — so you can see proof, a tailored CV, and a pitch before you type.
        </p>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-16" data-tour="landing-path">
        <h2 className="font-heading text-2xl tracking-tight md:text-3xl">{t.how}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [t.step1, t.step1d],
            [t.step2, t.step2d],
            [t.step3, t.step3d],
            [t.step4, t.step4d],
          ].map(([title, d], i) => (
            <Card key={title} className="bg-card/60 backdrop-blur">
              <CardContent className="px-5">
                <p className="text-[var(--dawn)] text-xs font-medium">0{i + 1}</p>
                <h3 className="mt-2 font-heading text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-8 px-5 pb-20 md:grid-cols-2 md:items-end">
        <div>
          <h2 className="font-heading text-2xl tracking-tight md:text-3xl">{t.whyTitle}</h2>
          <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">{t.whyBody}</p>
        </div>
        <div data-tour="landing-partners">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.partners}</p>
          <div className="flex flex-wrap gap-2">
            {partners.map(([name, use]) => (
              <Badge key={name} variant="secondary" className="gap-2 px-3 py-1.5">
                <span>{name}</span>
                <span className="text-muted-foreground">{use}</span>
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative border-t px-5 py-8 text-center text-sm text-muted-foreground">
        {t.footer}
      </footer>
    </div>
  );
}
