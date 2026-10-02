const ITEMS = [
  {
    n: "01",
    title: "Formação de excelência",
    text: "Duas especializações e mestrado em Implantodontia, com atuação acadêmica contínua.",
  },
  {
    n: "02",
    title: "Professor e coordenador",
    text: "Docência em ABO-TAG, IBPG e Odonto Insight — quem ensina, aprofunda o olhar clínico.",
  },
  {
    n: "03",
    title: "Planejamento digital",
    text: "Planejamento digital e protocolos guiados para precisão milimétrica em cada implante.",
  },
  {
    n: "04",
    title: "Estética natural",
    text: "Próteses e reabilitações que respeitam harmonia facial, fonética e oclusão.",
  },
];

export default function Differentials() {
  return (
    <section className="relative overflow-hidden bg-navy-900 py-20 text-ice md:py-28">
      <img
        src="/images/clinic-consult.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-navy-950/75" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-azure">
            Por que escolher
          </p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl">
            Precisão clínica,{" "}
            <span className="text-gradient-azure">cuidado humano</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <article
              key={item.n}
              className="rounded-3xl border border-ice/10 bg-navy-950/50 p-6 backdrop-blur-sm"
            >
              <p className="font-display text-3xl text-azure">{item.n}</p>
              <h3 className="mt-4 font-display text-2xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ice/65">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
