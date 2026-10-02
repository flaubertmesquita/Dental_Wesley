const STATS = [
  { value: "+15", label: "Anos de prática" },
  { value: "+3.000", label: "Sorrisos reabilitados" },
  { value: "2", label: "Especializações" },
  { value: "Mestre", label: "Em Implantodontia" },
];

export default function Stats() {
  return (
    <section className="bg-ice">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-ice-deep sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-ice px-4 py-10 text-center">
            <p className="font-display text-4xl text-navy-900 md:text-5xl">{s.value}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ink/55">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
