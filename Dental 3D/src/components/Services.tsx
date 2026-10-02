const WA =
  "https://wa.me/5561991198306?text=" +
  encodeURIComponent("Olá Dr. Wesley, gostaria de agendar uma avaliação.");

const SERVICES = [
  {
    title: "Implantodontia",
    tag: "Especialidade · Mestrado",
    desc: "Reposição de dentes perdidos com implantes de alta performance, planejamento digital e resultados previsíveis e duradouros.",
    img: "https://images.pexels.com/photos/6627606/pexels-photo-6627606.jpeg?auto=compress&cs=tinysrgb&w=1400",
    items: [
      "Implantes unitários e múltiplos",
      "Prótese protocolo sobre implantes",
      "Enxertos e regeneração óssea",
      "Planejamento digital e cirurgia guiada",
    ],
  },
  {
    title: "Prótese Dentária",
    tag: "Especialidade",
    desc: "Próteses com estética natural, oclusão precisa e máximo conforto — da coroa unitária à reabilitação oral completa.",
    img: "https://images.pexels.com/photos/6627571/pexels-photo-6627571.jpeg?auto=compress&cs=tinysrgb&w=1400",
    items: [
      "Coroas e facetas em cerâmica",
      "Próteses fixas e removíveis",
      "Prótese sobre implante",
      "Reabilitação oral completa",
    ],
  },
];

export default function Services() {
  return (
    <section id="especialidades" className="bg-navy-950 py-20 text-white md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-azure">O que fazemos</p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl">Especialidades</h2>
          <p className="mt-4 text-white/65">
            Duas especialidades, um mesmo compromisso: devolver função, estética e confiança com precisão clínica.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {SERVICES.map((s) => (
            <article
              key={s.title}
              className="group flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-navy-900/60 transition duration-500 hover:-translate-y-1 hover:border-azure/40"
            >
              <div className="relative h-56 overflow-hidden sm:h-64">
                <img
                  src={s.img}
                  alt={s.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent" />
                <span className="absolute left-5 top-5 rounded-full bg-navy-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-azure backdrop-blur-sm">
                  {s.tag}
                </span>
                <h3 className="absolute bottom-5 left-6 font-display text-3xl text-white">{s.title}</h3>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <p className="text-[15px] leading-relaxed text-white/70">{s.desc}</p>
                <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {s.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-[14px] text-white/85">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-azure" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12.5l4.2 4.2L19 7" />
                      </svg>
                      {it}
                    </li>
                  ))}
                </ul>
                <a
                  href={WA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-azure transition hover:gap-3 hover:text-azure-light"
                >
                  Agendar avaliação
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
