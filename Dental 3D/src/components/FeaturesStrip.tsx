import type { ReactNode } from "react";

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-[22px] w-[22px]"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const FEATURES: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: "Clínica Moderna",
    desc: "Conforto e acolhimento",
    icon: (
      <Icon>
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M10 21v-5h4v5" />
        <path d="M12 7.5v4M10 9.5h4" />
      </Icon>
    ),
  },
  {
    title: "Especialista Certificado",
    desc: "ABO-DF · FO-UFU · SLMandic",
    icon: (
      <Icon>
        <circle cx="12" cy="9" r="6" />
        <path d="m8.6 13.9-1.6 7.1 5-2.6 5 2.6-1.6-7.1" />
        <path d="m9.6 9 1.7 1.7 3.2-3.2" />
      </Icon>
    ),
  },
  {
    title: "Tecnologia Avançada",
    desc: "Planejamento digital e guiado",
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
        <path d="M7 10h2.2l1.4-2.6 2.6 5.2 1.4-2.6H17" />
      </Icon>
    ),
  },
  {
    title: "Foco no Paciente",
    desc: "Cuidado individualizado",
    icon: (
      <Icon>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </Icon>
    ),
  },
];

const BORDERS = ["border-b border-r lg:border-b-0", "border-b lg:border-b-0 lg:border-r", "border-r", ""];

const INSTITUTIONS = ["ABO-DF", "FO-UFU", "SLMandic", "ABO-TAG", "IBPG", "Odonto Insight"];

export function FeatureCard() {
  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-[26px] bg-white shadow-[0_30px_80px_-28px_rgba(3,12,46,0.55)] ring-1 ring-navy-100">
      <ul className="grid grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <li
            key={f.title}
            className={`group flex items-center gap-3 border-navy-100 p-4 sm:gap-4 sm:p-5 lg:p-6 ${BORDERS[i]}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 text-white shadow-[0_12px_24px_-12px_rgba(29,88,240,0.95)] transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-12 sm:w-12">
              {f.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[13.5px] leading-tight text-navy-950 sm:text-[15px]">
                {f.title}
              </span>
              <span className="mt-1 block text-[11.5px] leading-snug text-ink/55 sm:text-[13px]">{f.desc}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 border-t border-navy-100 bg-ice px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-700/75 sm:text-[11px]">
        <span className="text-ink/40">Formação &amp; docência</span>
        {INSTITUTIONS.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/** Standalone strip for mobile and reduced-motion (desktop shows it inside the pinned hero). */
export default function FeaturesStrip() {
  return (
    <section
      aria-label="Diferenciais"
      className="relative z-20 -mt-12 px-4 sm:px-6 md:hidden md:motion-reduce:-mt-16 md:motion-reduce:block md:motion-reduce:px-8"
    >
      <FeatureCard />
    </section>
  );
}
