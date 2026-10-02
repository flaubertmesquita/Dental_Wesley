const QUOTES = [
  {
    name: "Mariana Alves",
    place: "Asa Sul · Brasília",
    text: "Recuperei a confiança para sorrir. O Dr. Wesley explicou cada etapa da reabilitação com implantes e o resultado ficou extremamente natural.",
  },
  {
    name: "Ricardo Mendonça",
    place: "Lago Sul · Brasília",
    text: "Procurei um especialista e encontrei um professor. O cuidado com o planejamento e a precisão da prótese superaram o que eu esperava.",
  },
  {
    name: "Fernanda Costa",
    place: "Águas Claras · DF",
    text: "Atendimento humano, ambiente sereno e um sorriso que parece meu — só que melhor. Recomendo de olhos fechados.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-navy-950 py-20 text-ice md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-azure">
            Pacientes
          </p>
          <h2 className="mt-3 font-display text-4xl md:text-5xl">
            Histórias que inspiram
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {QUOTES.map((q) => (
            <blockquote
              key={q.name}
              className="flex flex-col rounded-3xl border border-ice/10 bg-navy-900/40 p-7"
            >
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-azure/80" fill="currentColor" aria-hidden>
                <path d="M9.5 8.5C9.5 5.5 7.2 4 4.8 4v3.2c1.3 0 2.2.7 2.2 2V20H12V8.5H9.5Zm10.3 0C19.8 5.5 17.5 4 15.1 4v3.2c1.3 0 2.2.7 2.2 2V20H22.3V8.5h-2.5Z" />
              </svg>
              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ice/80">{q.text}</p>
              <footer className="mt-6">
                <p className="font-display text-xl text-ice">{q.name}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-azure/80">{q.place}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
