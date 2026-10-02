import { useEffect, useState } from "react";

const NAV = [
  { href: "#sobre", label: "Sobre" },
  { href: "#especialidades", label: "Especialidades" },
  { href: "#credenciais", label: "Credenciais" },
  { href: "#contato", label: "Contato" },
];

const WA =
  "https://wa.me/5561991198306?text=" +
  encodeURIComponent("Olá Dr. Wesley, gostaria de agendar uma consulta.");

function ToothIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M7 2.5C4.5 2.5 2.6 4.6 2.6 7.2c0 2.2.9 3.7 1.6 5.6.7 2 .9 4.3 1.4 6.4.3 1.5.9 3.5 2.2 3.5 1.6 0 1.8-2.6 2.1-4.1.3-1.5.7-3.1 2.1-3.1s1.8 1.6 2.1 3.1c.3 1.5.5 4.1 2.1 4.1 1.3 0 1.9-2 2.2-3.5.5-2.1.7-4.4 1.4-6.4.7-1.9 1.6-3.4 1.6-5.6 0-2.6-1.9-4.7-4.4-4.7-2.1 0-3.4 1.1-5.4 1.1S9.1 2.5 7 2.5Z" />
    </svg>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-500 ${
          scrolled || open
            ? "bg-navy-950/85 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 md:h-20 md:px-8">
          <a href="#inicio" className="flex items-center gap-3" aria-label="Dr. Wesley Borba Toledo — início">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-azure to-navy-600 text-white shadow-[0_10px_24px_-10px_rgba(95,182,255,0.9)]">
              <ToothIcon />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[16px] text-white">Dr. Wesley Borba</span>
              <span className="hidden text-[11px] font-medium text-azure-light/80 sm:block">
                Implantodontia &amp; Prótese
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="relative py-1 text-[14px] font-medium text-white/75 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-azure after:transition-transform after:duration-300 hover:text-white hover:after:scale-x-100"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 xl:gap-5">
            <a href="tel:+5561991198306" className="group hidden items-center gap-3 xl:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition group-hover:border-azure group-hover:text-azure">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block text-[11px] text-white/55">Ligue agora</span>
                <span className="block text-[14px] font-semibold text-white">(61) 99119-8306</span>
              </span>
            </a>
            <a
              href={WA}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2.5 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-navy-800 shadow-[0_12px_30px_-12px_rgba(130,190,255,0.9)] transition duration-300 hover:-translate-y-0.5 md:inline-flex"
            >
              Agendar Consulta
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-navy-600" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" />
              </svg>
            </a>
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 lg:hidden"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span className={`absolute h-[1.5px] w-5 bg-white transition-all duration-300 ${open ? "rotate-45" : "-translate-y-[5px]"}`} />
              <span className={`absolute h-[1.5px] w-5 bg-white transition-all duration-300 ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute h-[1.5px] w-5 bg-white transition-all duration-300 ${open ? "-rotate-45" : "translate-y-[5px]"}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen overlay uses dvh so it always matches the visible viewport */}
      <div
        id="mobile-menu"
        className={`fixed inset-x-0 top-0 z-40 h-dvh bg-navy-950 transition-all duration-500 lg:hidden ${
          open ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_80%_20%,rgba(58,116,255,0.35),transparent_70%)]" />
        <nav className="relative flex h-full flex-col items-center justify-center gap-7 pt-12" aria-label="Mobile">
          {NAV.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
              className={`font-display text-3xl text-white transition-all duration-500 ${
                open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              {item.label}
            </a>
          ))}
          <a
            href={WA}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-4 rounded-full bg-white px-8 py-3.5 text-[14px] font-semibold text-navy-800"
          >
            Agendar Consulta
          </a>
          <a href="tel:+5561991198306" className="text-[14px] text-white/60">
            (61) 99119-8306
          </a>
        </nav>
      </div>
    </>
  );
}
