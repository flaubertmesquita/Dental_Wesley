import { FormEvent, useState } from "react";

const SERVICES = ["Implantodontia", "Prótese Dentária", "Avaliação / Primeira consulta"];

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    service: SERVICES[2],
    message: "",
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = [
      `Olá Dr. Wesley, meu nome é ${form.name}.`,
      `Gostaria de agendar uma consulta para: ${form.service}.`,
      form.phone ? `Meu telefone: ${form.phone}.` : "",
      form.message ? `Mensagem: ${form.message}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    window.open(
      `https://wa.me/5561991198306?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setSent(true);
  };

  return (
    <section id="contato" className="bg-ice py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-2 md:px-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-navy-700">
            Agenda
          </p>
          <h2 className="mt-3 font-display text-4xl text-navy-950 md:text-5xl">
            Agende sua consulta
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/70">
            Conte-nos o que você precisa. Retornamos pelo WhatsApp para confirmar
            horário e orientar os próximos passos.
          </p>

          <ul className="mt-10 space-y-5">
            <li>
              <p className="text-[11px] uppercase tracking-[0.2em] text-azure-dark">WhatsApp</p>
              <a href="tel:+5561991198306" className="mt-1 block font-display text-xl text-navy-950">
                (61) 99119-8306
              </a>
            </li>
            <li>
              <p className="text-[11px] uppercase tracking-[0.2em] text-azure-dark">Instagram</p>
              <a
                href="https://instagram.com/wesleyborba.toledo"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block font-display text-xl text-navy-950"
              >
                @wesleyborba.toledo
              </a>
            </li>
            <li>
              <p className="text-[11px] uppercase tracking-[0.2em] text-azure-dark">Local</p>
              <p className="mt-1 font-display text-xl text-navy-950">Brasília — Distrito Federal</p>
            </li>
          </ul>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-ice-deep bg-white p-6 shadow-[0_20px_50px_rgba(10,48,56,0.06)] md:p-8"
        >
          {sent ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-azure">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-5 font-display text-3xl text-navy-950">Mensagem pronta</h3>
              <p className="mt-2 max-w-sm text-sm text-ink/65">
                Abrimos o WhatsApp com os seus dados. Se a janela não apareceu,
                verifique o bloqueio de pop-ups e tente novamente.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-6 text-[12px] uppercase tracking-[0.16em] text-navy-700"
              >
                Enviar outra mensagem
              </button>
            </div>
          ) : (
            <>
              <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-navy-800">
                Nome
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-ice-deep bg-ice px-4 py-3 text-[15px] font-normal tracking-normal text-ink outline-none transition focus:border-navy-700"
                  placeholder="Seu nome completo"
                />
              </label>
              <label className="mt-4 block text-[12px] font-medium uppercase tracking-[0.14em] text-navy-800">
                Telefone
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-ice-deep bg-ice px-4 py-3 text-[15px] font-normal tracking-normal text-ink outline-none transition focus:border-navy-700"
                  placeholder="(61) 9xxxx-xxxx"
                />
              </label>
              <label className="mt-4 block text-[12px] font-medium uppercase tracking-[0.14em] text-navy-800">
                Especialidade
                <select
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-ice-deep bg-ice px-4 py-3 text-[15px] font-normal tracking-normal text-ink outline-none transition focus:border-navy-700"
                >
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block text-[12px] font-medium uppercase tracking-[0.14em] text-navy-800">
                Mensagem
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="mt-2 w-full resize-none rounded-xl border border-ice-deep bg-ice px-4 py-3 text-[15px] font-normal tracking-normal text-ink outline-none transition focus:border-navy-700"
                  placeholder="Conte brevemente o que você busca"
                />
              </label>
              <button
                type="submit"
                className="mt-6 w-full rounded-full bg-navy-900 py-3.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ice transition hover:bg-navy-800"
              >
                Enviar pelo WhatsApp
              </button>
              <p className="mt-3 text-center text-[11px] text-ink/45">
                Ao enviar, você será redirecionado ao WhatsApp do Dr. Wesley.
              </p>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
