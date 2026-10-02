const WA =
  "https://wa.me/5561991198306?text=" +
  encodeURIComponent("Olá Dr. Wesley, gostaria de agendar uma consulta.");

const LINKS = [
  { href: "#sobre", label: "Sobre" },
  { href: "#especialidades", label: "Especialidades" },
  { href: "#credenciais", label: "Credenciais" },
  { href: "#contato", label: "Contato" },
];

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-ice">
      <div className="azure-line" />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-3 md:px-8 md:py-20">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-azure/50 text-sm font-semibold text-azure">
              WB
            </span>
            <div>
              <p className="font-display text-xl text-ice">Dr. Wesley Borba Toledo</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-azure/80">
                Implantodontia &amp; Prótese
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ice/65">
            Excelência em reabilitação oral em Brasília. Especialista e mestre em
            Implantodontia, professor e coordenador de cursos de especialização.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-azure">Navegação</p>
          <ul className="mt-5 space-y-3">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-sm text-ice/70 transition hover:text-azure">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-azure">Atendimento</p>
          <ul className="mt-5 space-y-3 text-sm text-ice/70">
            <li>
              <a href="tel:+5561991198306" className="transition hover:text-azure">
                (61) 99119-8306
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/wesleyborba.toledo"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-azure"
              >
                @wesleyborba.toledo
              </a>
            </li>
            <li>Brasília — Distrito Federal</li>
            <li>
              <a href={WA} target="_blank" rel="noopener noreferrer" className="transition hover:text-azure">
                WhatsApp · Agendar consulta
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ice/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-[11px] uppercase tracking-[0.16em] text-ice/40 md:flex-row md:px-8">
          <p>© {new Date().getFullYear()} Dr. Wesley Borba Toledo. Todos os direitos reservados.</p>
          <p>Odontologia de excelência · Brasília-DF</p>
        </div>
      </div>
    </footer>
  );
}
