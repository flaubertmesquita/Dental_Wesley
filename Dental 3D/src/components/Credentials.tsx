const INSTITUTIONS = [
  {
    title: "Especialista em Prótese",
    org: "ABO-DF",
    detail: "Associação Brasileira de Odontologia — Distrito Federal",
  },
  {
    title: "Especialista em Implantodontia",
    org: "FO-UFU",
    detail: "Faculdade de Odontologia da Universidade Federal de Uberlândia",
  },
  {
    title: "Mestrado em Implantodontia",
    org: "SLMandic / Campinas",
    detail: "Formação stricto sensu em implantodontia de alta complexidade",
  },
  {
    title: "Professor — Implantodontia",
    org: "ABO-TAG",
    detail: "Docente do curso de especialização em implantodontia",
  },
  {
    title: "Professor e Coordenador",
    org: "IBPG · Implantodontia",
    detail: "Coordenação do curso de especialização em implantodontia",
  },
  {
    title: "Professor e Coordenador",
    org: "IBPG · Prótese",
    detail: "Coordenação do curso de especialização em prótese dentária",
  },
  {
    title: "Professor — Prótese Implantada",
    org: "Odonto Insight",
    detail: "Curso de aperfeiçoamento em prótese sobre implante",
  },
];

export default function Credentials() {
  return (
    <section id="credenciais" className="bg-ice py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy-700">
              Trajetória
            </p>
            <h2 className="mt-3 font-display text-4xl text-navy-950 md:text-5xl">
              Credenciais &amp; Docência
            </h2>
            <div className="mt-4 h-px w-16 bg-azure" />
            <p className="mt-6 text-[15px] leading-relaxed text-ink/70">
              Uma carreira construída entre o consultório e a sala de aula.
              Formar especialistas exige domínio técnico — e esse domínio se
              traduz no cuidado de cada paciente.
            </p>
            <div className="mt-10 hidden overflow-hidden rounded-3xl md:block">
              <img
                src="/images/clinic-consult.jpg"
                alt="Consultório de odontologia de excelência"
                className="aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <ol className="md:col-span-8 md:pt-10">
            {INSTITUTIONS.map((item, i) => (
              <li
                key={item.org + item.title}
                className="grid grid-cols-[auto_1fr] gap-5 border-b border-ice-deep/70 py-5 first:pt-0"
              >
                <span className="font-display text-2xl text-navy-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-navy-700">{item.org}</p>
                  <h3 className="mt-1 font-display text-xl text-navy-950">{item.title}</h3>
                  <p className="mt-1 text-sm text-ink/60">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
