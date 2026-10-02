import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Implant3D from "./Implant3D";
import DoctorPhoto from "./DoctorPhoto";
import { FeatureCard } from "./FeaturesStrip";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const WA =
  "https://wa.me/5561991198306?text=" +
  encodeURIComponent("Olá Dr. Wesley, gostaria de agendar uma consulta.");

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const PILLS: { label: string; icon: ReactNode }[] = [
  {
    label: "Implantes guiados",
    icon: (
      <Icon>
        <path d="M8 3h8l-1.2 4H9.2z" />
        <path d="M9.5 7.5h5M10 10.5h4M10.4 13.5h3.2M10.8 16.5h2.4M12 19.5V21" />
      </Icon>
    ),
  },
  {
    label: "Prótese sobre implante",
    icon: (
      <Icon>
        <path d="M8 3.5c-1.9 0-3.5 1.4-3.5 3.4 0 1.5.7 2.6 1.3 3.6h12.4c.6-1 1.3-2.1 1.3-3.6 0-2-1.6-3.4-3.5-3.4-1.5 0-2.3.8-4 .8s-2.5-.8-4-.8Z" />
        <path d="M10 10.5v1.8h4v-1.8" />
        <path d="M10.2 12.3h3.6l-.4 7.2L12 21l-1.4-1.5z" />
        <path d="M9.6 14.6h4.8M9.9 17h4.2" />
      </Icon>
    ),
  },
  {
    label: "Planejamento digital",
    icon: (
      <Icon>
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7.5 12h9M12 7.5v9" />
      </Icon>
    ),
  },
  {
    label: "Atendimento humanizado",
    icon: (
      <Icon>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </Icon>
    ),
  },
];

const AVATARS = ["/images/result-after-1.jpg", "/images/result-after-2.jpg", "/images/result-after-3.jpg"];

function Star() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-amber-400" aria-hidden="true">
      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
    </svg>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLUListElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const emergeRef = useRef<HTMLDivElement>(null);
  const sceneProgress = useRef({ p: 0 });

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          mobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const desktop = Boolean(context.conditions?.desktop);

          if (desktop) {
            // Horizontal distance (layout px, transform-independent) to center the 3D stage
            const centerShift = () => {
              const frame = frameRef.current;
              const stage = stageRef.current;
              if (!frame || !stage) return 0;
              let left = 0;
              let el: HTMLElement | null = stage;
              while (el && el !== frame) {
                left += el.offsetLeft;
                el = el.offsetParent as HTMLElement | null;
              }
              return frame.offsetWidth / 2 - (left + stage.offsetWidth / 2);
            };

            const tl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: section,
                start: "top top",
                end: () => `+=${Math.round(window.innerHeight)}`,
                pin: true,
                scrub: 1,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            });

            // PHASE 2 — scroll progression
            tl.fromTo(bgRef.current, { scale: 1.16, yPercent: -2, y: 0 }, { scale: 1, yPercent: 6, duration: 0.75 }, 0)
              .fromTo(overlayRef.current, { opacity: 0 }, { opacity: 0.6, duration: 0.8 }, 0)
              .to(titleRef.current, { y: -48, duration: 0.6 }, 0)
              .to(subtitleRef.current, { autoAlpha: 0, y: -20, duration: 0.34 }, 0.02)
              .to(ctaRef.current, { scale: 0.9, duration: 0.5 }, 0.04)
              .to(trustRef.current, { autoAlpha: 0, y: -14, duration: 0.3 }, 0.08)
              .to(noteRef.current, { autoAlpha: 0, y: -18, duration: 0.26 }, 0.04)
              .to(
                pillsRef.current ? Array.from(pillsRef.current.children) : [],
                { autoAlpha: 0, x: 28, stagger: 0.035, duration: 0.22 },
                0.1
              )
              .to(sceneProgress.current, { p: 1, duration: 1 }, 0)
              // PHASE 3 — transition
              .to(chipRef.current, { autoAlpha: 0, y: 20, duration: 0.24 }, 0.56)
              .to(contentRef.current, { y: -120, autoAlpha: 0, duration: 0.34 }, 0.6)
              .to(stageRef.current, { x: centerShift, scale: 1.04, duration: 0.4 }, 0.6)
              .to(frameRef.current, { scale: 0.94, borderRadius: 40, duration: 0.4 }, 0.6)
              .fromTo(
                emergeRef.current,
                { yPercent: 140, y: 0 },
                { yPercent: 0, duration: 0.34, ease: "power1.out" },
                0.66
              );
          } else {
            // Mobile: no pin, gentle parallax only
            const st = () => ({
              trigger: section,
              start: "top top",
              end: "bottom top",
              scrub: 1,
              invalidateOnRefresh: true,
            });
            gsap.fromTo(bgRef.current, { scale: 1.08 }, { scale: 1, yPercent: 5, ease: "none", scrollTrigger: st() });
            gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 0.45, ease: "none", scrollTrigger: st() });
            gsap.to(sceneProgress.current, { p: 1, ease: "none", scrollTrigger: st() });
          }
        }
      );
    }, section);

    // Refresh only when necessary: a late web-font swap can change the
    // (content-height) mobile hero; the pinned desktop hero has a fixed height.
    let alive = true;
    const initialHeight = section.offsetHeight;
    void document.fonts?.ready.then(() => {
      if (alive && Math.abs(section.offsetHeight - initialHeight) > 1) ScrollTrigger.refresh();
    });

    return () => {
      alive = false;
      ctx.revert();
    };
  }, []);

  return (
    <section id="hero-section" ref={sectionRef} aria-labelledby="hero-title" className="relative isolate bg-ice">
      <div
        ref={frameRef}
        className="hero-frame relative overflow-hidden bg-navy-950 text-white will-change-transform md:absolute md:inset-0"
      >
        {/* Background photo — slow zoom-out on scroll */}
        <div ref={bgRef} className="absolute inset-0 will-change-transform">
          <img
            src="/images/hero-clinic.jpg"
            alt=""
            className="h-full w-full object-cover opacity-40 grayscale"
            fetchPriority="high"
            decoding="async"
          />
        </div>
        {/* Blue duotone + lighting */}
        {/* Cinematic deep-blue grade (darker so the 3D glow pops) */}
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(2,8,30,0.97)_0%,rgba(3,12,44,0.95)_38%,rgba(5,20,72,0.9)_70%,rgba(8,30,98,0.86)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(46%_56%_at_72%_50%,rgba(40,130,255,0.34),transparent_70%)]" />
        <div className="pointer-events-none absolute -left-48 -top-48 h-[560px] w-[560px] rounded-full bg-navy-600/20 blur-[120px]" />
        <div className="hero-rays pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-950/80 to-transparent" />
        {/* Deepens progressively on scroll */}
        <div ref={overlayRef} className="pointer-events-none absolute inset-0 bg-navy-950 opacity-0" />
        <div className="grain pointer-events-none absolute inset-0" />

        <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-7xl grid-cols-1 content-center items-center gap-2 px-5 pb-20 pt-24 md:h-full md:min-h-0 md:grid-cols-[1.04fr_1fr] md:gap-6 md:px-8 md:pb-8 lg:gap-10">
          {/* ---------- Copy ---------- */}
          <div ref={contentRef} className="order-2 max-w-xl md:order-1">
            <p
              className="hero-enter flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-azure-light md:text-[11px]"
              style={{ animationDelay: "0.1s" }}
            >
              <span>Especialista</span>
              <span className="h-1 w-1 rounded-full bg-azure" />
              <span>Mestre em Implantodontia</span>
              <span className="h-1 w-1 rounded-full bg-azure" />
              <span>Brasília-DF</span>
            </p>

            <h1
              ref={titleRef}
              id="hero-title"
              className="mt-4 font-display text-[clamp(2.1rem,9.4vw,2.75rem)] font-extrabold leading-[1.04] tracking-[-0.035em] md:mt-5 md:text-[min(4.9vw,9.4svh,4rem)]"
            >
              <span className="hero-enter block text-white" style={{ animationDelay: "0.18s" }}>
                Todo bom sorriso{" "}
              </span>
              <span className="hero-enter text-gradient-azure block pb-[0.08em]" style={{ animationDelay: "0.28s" }}>
                começa pela raiz
              </span>
            </h1>

            <div ref={subtitleRef}>
              <p
                className="hero-enter mt-4 max-w-md text-[15px] leading-relaxed text-white/75 md:mt-5 md:text-[17px]"
                style={{ animationDelay: "0.38s" }}
              >
                Excelência em odontologia moderna para proporcionar a você a confiança de um sorriso perfeito e
                saudável.
              </p>
            </div>

            <div ref={ctaRef} className="mt-7 origin-left">
              <div
                className="hero-enter flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ animationDelay: "0.48s" }}
              >
                <a
                  href={WA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-between gap-4 rounded-full bg-white py-2 pl-6 pr-2 text-[14px] font-semibold text-navy-800 shadow-[0_18px_40px_-14px_rgba(130,190,255,0.85)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-12px_rgba(130,190,255,1)] sm:justify-center"
                >
                  Agendar Consulta
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-600 text-white transition-transform duration-300 group-hover:translate-x-0.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </a>
                <a
                  href="#sobre"
                  className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/5 py-2 pl-2 pr-6 text-[14px] font-medium text-white backdrop-blur-sm transition duration-300 hover:border-white/45 hover:bg-white/10"
                >
                  <DoctorPhoto variant="avatar" className="h-9 w-9 shrink-0 rounded-full ring-2 ring-azure/60" imgClassName="object-top" />
                  Conheça o Dr. Wesley
                </a>
              </div>
            </div>

            <div ref={trustRef} className="mt-8 md:[@media(max-height:720px)]:hidden">
              <div className="hero-enter flex items-center gap-4" style={{ animationDelay: "0.58s" }}>
                <div className="flex -space-x-3">
                  {AVATARS.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-10 w-10 rounded-full border-2 border-navy-900 object-cover"
                    />
                  ))}
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy-900 bg-navy-600 text-[11px] font-bold">
                    +3k
                  </span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">+3.000 sorrisos reabilitados</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[12px] text-white/60">
                    <span className="flex">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} />
                      ))}
                    </span>
                    Excelência reconhecida
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- 3D stage ---------- */}
          <div
            ref={stageRef}
            aria-hidden="true"
            className="relative order-1 mx-auto h-[46svh] min-h-[300px] w-full max-w-[660px] md:order-2 md:h-[min(78svh,760px)]"
          >
            <div className="pointer-events-none absolute left-1/2 top-[44%] aspect-square w-[min(78%,460px)] -translate-x-1/2 -translate-y-1/2 lg:left-[42%]">
              <div className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle,rgba(64,150,255,0.14),transparent_68%)] blur-2xl" />
            </div>

            <Implant3D progress={sceneProgress} className="absolute inset-0 lg:right-[16%]" />

            <div ref={noteRef} className="pointer-events-none absolute right-[1%] top-[1%] hidden lg:block">
              <div
                className="hero-enter rotate-[-7deg] text-right font-script text-[30px] font-semibold leading-[0.95] text-white/90 xl:text-[34px]"
                style={{ animationDelay: "0.9s" }}
              >
                Mais saúde,
                <br />
                mais sorriso,
                <br />
                mais você
                <svg viewBox="0 0 40 28" className="ml-auto mt-1 h-7 w-10" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <path d="M14 4v3M26 4v3" />
                  <path d="M8 13c5 9 19 9 24 0" />
                </svg>
              </div>
            </div>

            <ul ref={pillsRef} className="absolute right-0 top-[57%] hidden flex-col gap-2.5 lg:flex">
              {PILLS.map((pill, i) => (
                <li key={pill.label}>
                  <span
                    className="hero-enter flex items-center gap-2.5 rounded-xl border border-white/60 bg-white/95 py-2 pl-2 pr-4 text-[12.5px] font-semibold text-navy-900 shadow-[0_12px_30px_-12px_rgba(2,10,40,0.6)]"
                    style={{ animationDelay: `${0.75 + i * 0.1}s` }}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-navy-500 to-navy-700 text-white">
                      {pill.icon}
                    </span>
                    {pill.label}
                  </span>
                </li>
              ))}
            </ul>

            <div ref={chipRef} className="absolute bottom-[3%] left-0 hidden md:block lg:left-[2%]">
              <div
                className="hero-enter flex items-center gap-3 rounded-2xl border border-white/15 bg-navy-950/40 p-2.5 pr-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md"
                style={{ animationDelay: "1.05s" }}
              >
                <DoctorPhoto variant="avatar" className="h-11 w-11 shrink-0 rounded-xl" imgClassName="object-top" />
                <div className="leading-tight">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                    Dr. Wesley Borba Toledo
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-azure" fill="currentColor" aria-hidden="true">
                      <path d="M12 1.5l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22.5l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2L12 1.5Zm-1.2 13.6 5.3-5.3-1.2-1.2-4.1 4.1-2-2-1.2 1.2 3.2 3.2Z" />
                    </svg>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-azure-light/80">Especialista &amp; Mestre em Implantodontia</p>
                </div>
              </div>
            </div>

            <p className="pointer-events-none absolute bottom-[4%] right-[4%] hidden items-center gap-1.5 text-[11px] font-medium text-white/45 md:flex lg:right-[20%]">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 4v4h-4" />
              </svg>
              Arraste para girar
            </p>
          </div>
        </div>
      </div>

      {/* Next section emerging during the pinned transition (desktop + motion) */}
      <div
        ref={emergeRef}
        className="hero-emerge-card absolute inset-x-0 bottom-5 z-20 hidden px-8 md:block md:motion-reduce:hidden"
      >
        <FeatureCard />
      </div>
    </section>
  );
}
