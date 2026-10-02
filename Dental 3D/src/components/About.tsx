import DoctorPhoto from "./DoctorPhoto";

const CREDENTIALS = [
  "Especialista em Prótese pela ABO-DF",
  "Especialista em Implantodontia pela FO-UFU",
  "Mestrado em Implantodontia pela SLMandic / Campinas",
  "Professor do curso de especialização de implantodontia da ABO-TAG",
  "Professor e coordenador do curso de especialização de implantodontia do IBPG",
  "Professor e coordenador do curso de especialização em Prótese do IBPG",
  "Professor do curso de aperfeiçoamento em prótese implantada da Odonto Insight",
];

/** Frame echoing the profile card: large rounded top-left arch. */
const ARCH = "70% 46%";

export default function About() {
  return (
    <section id="sobre" className="relative bg-ice py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-12 md:gap-16 md:px-8">
        <div className="relative mx-auto w-full max-w-md md:col-span-5 md:max-w-none">
          {/* Decorative arch line, like the card's thin accent */}
          <div
            className="pointer-events-none absolute -left-3 -top-3 bottom-10 right-10 border-l border-t border-azure/50 md:-left-5 md:-top-5"
            style={{ borderTopLeftRadius: ARCH }}
          />
          <DoctorPhoto
            variant="portrait"
            alt="Dr. Wesley Borba Toledo, especialista em implantodontia e prótese dentária"
            className="aspect-[4/5] w-full rounded-[28px] shadow-[0_30px_60px_rgba(7,26,86,0.22)]"
            imgClassName="object-top"
            style={{ borderTopLeftRadius: ARCH }}
          />
          <div className="absolute -bottom-6 -right-2 rounded-2xl bg-navy-900 px-5 py-4 text-white shadow-xl md:-right-6">
            <p className="font-display text-3xl leading-none text-azure">+15</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/70">Anos de excelência</p>
          </div>
        </div>

        <div className="md:col-span-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy-700">O especialista</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-navy-950 md:text-5xl">Dr. Wesley Borba Toledo</h2>
          <div className="mt-4 h-px w-16 bg-azure" />
          <p className="mt-6 text-[17px] leading-relaxed text-ink/75">
            Com formação de excelência e atuação como professor e coordenador de cursos de especialização, o Dr.
            Wesley dedica sua carreira à reabilitação oral de alta precisão — unindo ciência, técnica e um olhar
            humano para cada sorriso.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/65">
            Atende em Brasília com foco em implantodontia e prótese dentária, oferecendo planejamento digital,
            materiais de última geração e resultados naturais que devolvem função, estética e confiança.
          </p>

          <ul className="mt-8 space-y-3">
            {CREDENTIALS.map((item) => (
              <li key={item} className="flex gap-3 text-[14px] leading-snug text-ink/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-azure" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-navy-800">
            <a href="tel:+5561991198306" className="font-semibold transition hover:text-navy-600">
              (61) 99119-8306
            </a>
            <a
              href="https://instagram.com/wesleyborba.toledo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold transition hover:text-navy-600"
            >
              @wesleyborba.toledo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
