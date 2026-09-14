import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useTranslation } from 'react-i18next'

export default function TraditionalKnowledgeSection() {
  const { t } = useTranslation()
  const sectionRef = useRef(null)
  const headerContainerRef = useRef(null)
  const cardsContainerRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current
    const headerContainer = headerContainerRef.current
    const cardsContainer = cardsContainerRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      /* ── HEADER STAGGER ── */
      if (headerContainer) {
        gsap.from(headerContainer.querySelectorAll('.fly-header'), {
          y: 30,
          opacity: 0,
          duration: 0.85,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: headerContainer,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      }

      /* ── CARDS STAGGER ── */
      if (cardsContainer) {
        gsap.from(cardsContainer.querySelectorAll('.fly-card'), {
          y: 40,
          opacity: 0,
          scale: 0.97,
          duration: 0.95,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardsContainer,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        })
      }
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="traditional-knowledge-ip"
      data-theme="light"
      className="relative w-full bg-white text-[#161412] overflow-hidden select-none"
      style={{ padding: 'clamp(5rem, 10vw, 10rem) 0' }}
    >
      {/* ═══════════════════════════════════════════
          SECTION HEADER
          ═══════════════════════════════════════════ */}
      <div ref={headerContainerRef} className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-16 mb-20 sm:mb-28 md:mb-36">
        <div className="border-l-2 sm:border-l-[3px] border-[#176B45] pl-6 sm:pl-8 md:pl-10">
          <h2
            className="fly-header font-serif tracking-[-0.03em] leading-[1.05] text-[#161412] mb-8 sm:mb-10"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)' }}
          >
            {t('landing.tkSection.titleLine1')}
            <br />
            <span className="italic text-[#176B45]">{t('landing.tkSection.titleLine2')}</span>
          </h2>

          <div className="fly-header max-w-2xl">
            <p className="text-lg sm:text-xl text-[#4a4236] leading-[1.75] font-normal mb-5">
              {t('landing.tkSection.desc1')}
            </p>
            <p className="font-serif italic text-lg text-[#176B45] leading-relaxed">
              {t('landing.tkSection.desc2')}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          3-STEP CARDS
          ═══════════════════════════════════════════ */}
      <div ref={cardsContainerRef} className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">

        {/* ────────────────────────────────────────
            CARD 01 — TRADITIONAL KNOWLEDGE
            ──────────────────────────────────────── */}
        <div className="fly-card group relative flex flex-col bg-[#faf8f4] border border-[#e5dcce] rounded-2xl hover:shadow-xl hover:shadow-[#942a22]/5 transition-shadow duration-500">


          {/* Visual area */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-[#e5dcce]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#161412_1px,transparent_1px)] [background-size:20px_20px]" />

            <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-[#8a7f72] uppercase mb-4">
              <span>{t('landing.tkSection.card1.folio')}</span>
              <span className="text-[#942a22] font-semibold">{t('landing.tkSection.card1.type')}</span>
            </div>

            {/* Botanical SVG */}
            <div className="fly-frag relative z-10 flex items-center justify-center py-2">
              <svg
                className="w-full max-w-[180px] h-32"
                viewBox="0 0 240 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Ayurvedic Botanical Illustration: Tulsi"
              >
                <path d="M120 155 C120 110, 118 50, 120 15" stroke="#161412" strokeWidth="2" strokeLinecap="round" />
                <path d="M120 115 C100 105, 80 102, 60 92" stroke="#942a22" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M120 115 C140 105, 160 102, 180 92" stroke="#942a22" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M119 80 C100 72, 82 58, 68 42" stroke="#942a22" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M121 80 C140 72, 158 58, 172 42" stroke="#942a22" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M60 92 C42 86, 42 108, 62 104 C82 100, 102 106, 120 115 Z" stroke="#161412" strokeWidth="1.2" fill="rgba(148,42,34,0.07)" />
                <path d="M180 92 C198 86, 198 108, 178 104 C158 100, 138 106, 120 115 Z" stroke="#161412" strokeWidth="1.2" fill="rgba(148,42,34,0.07)" />
                <path d="M68 42 C50 36, 54 62, 74 56 C94 50, 108 64, 119 80 Z" stroke="#161412" strokeWidth="1.2" fill="rgba(148,42,34,0.07)" />
                <path d="M172 42 C190 36, 186 62, 166 56 C146 50, 132 64, 121 80 Z" stroke="#161412" strokeWidth="1.2" fill="rgba(148,42,34,0.07)" />
                <path d="M65 95 L80 101 M72 93 L92 103" stroke="#942a22" strokeWidth="0.6" strokeDasharray="2 2" />
                <path d="M175 95 L160 101 M168 93 L148 103" stroke="#942a22" strokeWidth="0.6" strokeDasharray="2 2" />
                <circle cx="120" cy="14" r="3" fill="#942a22" />
                <circle cx="115" cy="24" r="2.2" fill="#161412" />
                <circle cx="125" cy="24" r="2.2" fill="#161412" />
              </svg>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-[#786c5e] pt-2 border-t border-[#eee5d6]">
              <span className="italic font-serif text-[#161412] font-semibold">Ocimum sanctum Linn.</span>
              <span className="font-devanagari text-[#942a22]">तुलसी</span>
            </div>
          </div>

          {/* Content area */}
          <div className="flex flex-col flex-1 p-5 sm:p-6 pt-5">
            <span className="fly-frag text-[9px] font-mono font-bold tracking-[0.24em] text-[#942a22] uppercase block mb-2">
              {t('landing.tkSection.card1.eyebrow')}
            </span>
            <h3 className="font-serif text-2xl sm:text-[1.7rem] text-[#161412] tracking-[-0.02em] leading-[1.15] mb-4">
              {t('landing.tkSection.card1.title')}
            </h3>
            <p className="text-sm sm:text-[15px] text-[#4a4236] leading-[1.75] mb-5 flex-1">
              {t('landing.tkSection.card1.desc')}
            </p>
            <p className="fly-frag font-serif italic text-xs text-[#7d7162] leading-relaxed border-t border-[#eee5d6] pt-4">
              {t('landing.tkSection.card1.footnote')}
            </p>
          </div>
        </div>

        {/* ────────────────────────────────────────
            CARD 02 — DOCUMENTATION & PRIOR ART
            ──────────────────────────────────────── */}
        <div className="fly-card group relative flex flex-col bg-[#faf8f4] border border-[#e5dcce] rounded-2xl hover:shadow-xl hover:shadow-[#161412]/5 transition-shadow duration-500">


          {/* Visual area */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-[#e5dcce]">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#161412_1px,transparent_1px)] [background-size:20px_20px]" />

            <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-[#8a7f72] uppercase mb-4">
              <span>{t('landing.tkSection.card2.folio')}</span>
              <span className="text-[#942a22] font-semibold">{t('landing.tkSection.card2.type')}</span>
            </div>

            {/* Concordance record */}
            <div className="fly-frag relative z-10">
              <div className="border border-[#ded5c2] bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between text-[8px] font-mono text-[#786c5e] border-b border-[#eee5d6] pb-1.5 mb-2.5">
                  <span className="font-semibold text-[#161412]">TKDL/AYU/824</span>
                  <span className="text-[#942a22] font-bold">{t('landing.tkSection.card2.status')}</span>
                </div>
                <p className="font-devanagari text-[14px] text-[#161412] font-medium leading-snug mb-2.5">
                  कासश्वासहरं चैव हिक्काघ्नं दीपनं परम्।
                </p>
                <div className="grid grid-cols-2 gap-2 text-[8px] font-mono pt-2 border-t border-[#f2ece0]">
                  <div>
                    <span className="text-[#8a7f72] block uppercase">{t('landing.tkSection.card2.ipcLabel')}</span>
                    <span className="text-[#161412] font-bold">A61K 36/53</span>
                  </div>
                  <div>
                    <span className="text-[#8a7f72] block uppercase">{t('landing.tkSection.card2.statusLabel')}</span>
                    <span className="text-[#176B45] font-bold">{t('landing.tkSection.card2.statusValue')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-[#786c5e] pt-3 border-t border-[#eee5d6] mt-4">
              <span className="text-[#161412] font-semibold">{t('landing.tkSection.card2.disclosedCitation')}</span>
              <span>{t('landing.tkSection.card2.defensiveTag')}</span>
            </div>
          </div>

          {/* Content area */}
          <div className="flex flex-col flex-1 p-5 sm:p-6 pt-5">
            <span className="fly-frag text-[9px] font-mono font-bold tracking-[0.24em] text-[#3d362c] uppercase block mb-2">
              {t('landing.tkSection.card2.eyebrow')}
            </span>
            <h3 className="font-serif text-2xl sm:text-[1.7rem] text-[#161412] tracking-[-0.02em] leading-[1.15] mb-4">
              {t('landing.tkSection.card2.title')}
            </h3>
            <p className="text-sm sm:text-[15px] text-[#4a4236] leading-[1.75] mb-5 flex-1">
              {t('landing.tkSection.card2.desc')}
            </p>
            <p className="fly-frag font-serif italic text-xs text-[#7d7162] leading-relaxed border-t border-[#eee5d6] pt-4">
              {t('landing.tkSection.card2.footnote')}
            </p>
          </div>
        </div>

        {/* ────────────────────────────────────────
            CARD 03 — INTELLECTUAL PROPERTY
            ──────────────────────────────────────── */}
        <div className="fly-card group relative flex flex-col bg-[#faf8f4] border border-[#e5dcce] rounded-2xl hover:shadow-xl hover:shadow-[#176B45]/5 transition-shadow duration-500">


          {/* Visual area */}
          <div className="relative p-5 sm:p-6 pb-4 border-b border-[#e5dcce]">
            <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-[#8a7f72] uppercase mb-4">
              <span>{t('landing.tkSection.card3.folio')}</span>
              <span className="text-[#176B45] font-semibold">{t('landing.tkSection.card3.type')}</span>
            </div>

            {/* Patent document */}
            <div className="fly-frag relative z-10">
              <div className="border border-[#ded5c2] bg-white p-4 rounded-xl shadow-sm">
                <div className="text-[8px] font-mono text-[#8a7f72] uppercase mb-1.5">
                  {t('landing.tkSection.card3.actName')}
                </div>
                <h4 className="font-serif text-sm font-medium text-[#161412] leading-tight mb-2.5">
                  {t('landing.tkSection.card3.docTitle')}
                </h4>
                <div className="space-y-1.5 text-[8px] font-mono text-[#615749] pt-2 border-t border-[#f2ece0]">
                  <div className="flex justify-between">
                    <span>{t('landing.tkSection.card3.noveltyLabel')}</span>
                    <span className="text-[#176B45] font-bold">{t('landing.tkSection.card3.noveltyValue')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('landing.tkSection.card3.protectionLabel')}</span>
                    <span className="text-[#942a22] font-bold">{t('landing.tkSection.card3.protectionValue')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[9px] font-mono text-[#786c5e] pt-3 border-t border-[#eee5d6] mt-4">
              <span className="text-[#176B45] font-medium">{t('landing.tkSection.card3.statutoryTag')}</span>
              <span>{t('landing.tkSection.card3.innovationTag')}</span>
            </div>
          </div>

          {/* Content area */}
          <div className="flex flex-col flex-1 p-5 sm:p-6 pt-5">
            <span className="fly-frag text-[9px] font-mono font-bold tracking-[0.24em] text-[#176B45] uppercase block mb-2">
              {t('landing.tkSection.card3.eyebrow')}
            </span>
            <h3 className="font-serif text-2xl sm:text-[1.7rem] text-[#161412] tracking-[-0.02em] leading-[1.15] mb-4">
              {t('landing.tkSection.card3.title')}
            </h3>
            <p className="text-sm sm:text-[15px] text-[#4a4236] leading-[1.75] mb-5 flex-1">
              {t('landing.tkSection.card3.desc')}
            </p>
            <p className="fly-frag font-serif italic text-xs text-[#7d7162] leading-relaxed border-t border-[#eee5d6] pt-4">
              {t('landing.tkSection.card3.footnote')}
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
