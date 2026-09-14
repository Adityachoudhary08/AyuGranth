import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export default function PatentProcessSection() {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const cardsRef = useRef([])
  const nodesRef = useRef([])

  const PROCESS_STEPS = [
    {
      step: '01',
      stage: t('landing.patentProcess.step1.stage'),
      title: t('landing.patentProcess.step1.title'),
      subtitle: t('landing.patentProcess.step1.subtitle'),
      description: t('landing.patentProcess.step1.description'),
      keyAction: t('landing.patentProcess.step1.keyAction'),
      documentCode: t('landing.patentProcess.step1.documentCode'),
      statuteRef: t('landing.patentProcess.step1.statuteRef'),
      tag: t('landing.patentProcess.step1.tag'),
      accentColor: '#176B45',
    },
    {
      step: '02',
      stage: t('landing.patentProcess.step2.stage'),
      title: t('landing.patentProcess.step2.title'),
      subtitle: t('landing.patentProcess.step2.subtitle'),
      description: t('landing.patentProcess.step2.description'),
      keyAction: t('landing.patentProcess.step2.keyAction'),
      documentCode: t('landing.patentProcess.step2.documentCode'),
      statuteRef: t('landing.patentProcess.step2.statuteRef'),
      tag: t('landing.patentProcess.step2.tag'),
      accentColor: '#8e682c',
    },
    {
      step: '03',
      stage: t('landing.patentProcess.step3.stage'),
      title: t('landing.patentProcess.step3.title'),
      subtitle: t('landing.patentProcess.step3.subtitle'),
      description: t('landing.patentProcess.step3.description'),
      keyAction: t('landing.patentProcess.step3.keyAction'),
      documentCode: t('landing.patentProcess.step3.documentCode'),
      statuteRef: t('landing.patentProcess.step3.statuteRef'),
      tag: t('landing.patentProcess.step3.tag'),
      accentColor: '#1e4d36',
    },
    {
      step: '04',
      stage: t('landing.patentProcess.step4.stage'),
      title: t('landing.patentProcess.step4.title'),
      subtitle: t('landing.patentProcess.step4.subtitle'),
      description: t('landing.patentProcess.step4.description'),
      keyAction: t('landing.patentProcess.step4.keyAction'),
      documentCode: t('landing.patentProcess.step4.documentCode'),
      statuteRef: t('landing.patentProcess.step4.statuteRef'),
      tag: t('landing.patentProcess.step4.tag'),
      accentColor: '#7a4d28',
    },
    {
      step: '05',
      stage: t('landing.patentProcess.step5.stage'),
      title: t('landing.patentProcess.step5.title'),
      subtitle: t('landing.patentProcess.step5.subtitle'),
      description: t('landing.patentProcess.step5.description'),
      keyAction: t('landing.patentProcess.step5.keyAction'),
      documentCode: t('landing.patentProcess.step5.documentCode'),
      statuteRef: t('landing.patentProcess.step5.statuteRef'),
      tag: t('landing.patentProcess.step5.tag'),
      accentColor: '#8e2b24',
    },
    {
      step: '06',
      stage: t('landing.patentProcess.step6.stage'),
      title: t('landing.patentProcess.step6.title'),
      subtitle: t('landing.patentProcess.step6.subtitle'),
      description: t('landing.patentProcess.step6.description'),
      keyAction: t('landing.patentProcess.step6.keyAction'),
      documentCode: t('landing.patentProcess.step6.documentCode'),
      statuteRef: t('landing.patentProcess.step6.statuteRef'),
      tag: t('landing.patentProcess.step6.tag'),
      accentColor: '#176B45',
    },
  ]

  useEffect(() => {
    let ticking = false

    const updateOpacities = () => {
      ticking = false
      const viewportHeight = window.innerHeight
      // Optimal reading focal point: ~46% down the viewport
      const focalY = viewportHeight * 0.46
      // Broad falloff distance for a slow, continuous, smooth fade
      const falloffDistance = viewportHeight * 0.46

      cardsRef.current.forEach((card, idx) => {
        if (!card) return
        const rect = card.getBoundingClientRect()
        const cardCenterY = rect.top + rect.height * 0.5
        const dist = Math.abs(cardCenterY - focalY)

        // Continuous factor: 1 at focal point, 0 at >= falloffDistance
        const factor = Math.max(0, 1 - dist / falloffDistance)

        // Smooth cosine ease: continuous derivative with no abrupt transitions
        const smooth = 0.5 - 0.5 * Math.cos(factor * Math.PI)

        // Faint residual visibility of 0.20 for inactive/previous steps
        const minOpacity = 0.20
        const opacity = minOpacity + (1.0 - minOpacity) * smooth

        card.style.opacity = opacity.toFixed(3)

        // Visual indicator on the central timeline node
        const node = nodesRef.current[idx]
        if (node) {
          node.style.opacity = Math.max(0.35, opacity).toFixed(3)
          if (opacity > 0.65) {
            node.style.borderColor = '#176B45'
            node.style.boxShadow = '0 0 0 4px rgba(23, 107, 69, 0.16)'
          } else {
            node.style.borderColor = '#ded5c3'
            node.style.boxShadow = 'none'
          }
        }
      })
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updateOpacities)
      }
    }

    updateOpacities()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const renderCard = (s, index, side) => {
    const isGrant = index === 5

    return (
      <div
        ref={(el) => (cardsRef.current[index] = el)}
        className="relative w-full max-w-[500px] bg-white rounded-2xl border border-[#ded5c3]/80 p-6 sm:p-7 shadow-[0_8px_30px_rgba(30,22,12,0.06)] hover:shadow-[0_12px_36px_rgba(30,22,12,0.09)] transition-shadow will-change-[opacity] select-none"
        style={{ opacity: index === 0 ? 1 : 0.2 }}
      >
        {/* Horizontal visual connector line reaching to the central node on desktop */}
        {side === 'left' && (
          <div
            className="hidden md:block absolute top-1/2 -right-8 w-8 h-[1.5px] bg-[#ded5c3] -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
        )}
        {side === 'right' && (
          <div
            className="hidden md:block absolute top-1/2 -left-8 w-8 h-[1.5px] bg-[#ded5c3] -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Mobile connector line to left-aligned vertical line */}
        <div
          className="md:hidden absolute top-1/2 -left-8 sm:-left-10 w-8 sm:w-10 h-[1.5px] bg-[#ded5c3] -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />

        {/* 1. Header Bar with Step Badge & Stage */}
        <div className="flex items-center justify-between border-b border-[#ece4d4] pb-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-xs sm:text-[13px] text-[#176B45] bg-[#176B45]/10 px-2.5 py-0.5 rounded-full border border-[#176B45]/20">
              {t('landing.patentProcess.stepPrefix')} {s.step}
            </span>
            <span className="font-sans text-[11px] sm:text-xs font-bold tracking-[0.14em] uppercase text-[#6f6452]">
              {s.stage}
            </span>
          </div>

          <div>
            {isGrant ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#176B45]/10 border border-[#176B45]/30 text-[#176B45] text-[10px] font-mono font-bold uppercase tracking-wide">
                {t('landing.patentProcess.lettersPatent')}
              </span>
            ) : (
              <span className="font-mono text-[10px] sm:text-[10.5px] font-medium text-[#7d7363] tracking-wider uppercase">
                {s.documentCode}
              </span>
            )}
          </div>
        </div>

        {/* 2. Main High-Impact Editorial Content */}
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="font-sans text-xl sm:text-[23px] font-bold text-[#161412] tracking-tight leading-snug">
              {s.title}
            </h3>
            <span
              className="font-sans text-[10px] sm:text-[10.5px] font-bold px-2.5 py-0.5 rounded-md border shrink-0 tracking-wide"
              style={{
                borderColor: `${s.accentColor}40`,
                color: s.accentColor,
                backgroundColor: `${s.accentColor}0a`,
              }}
            >
              {s.tag}
            </span>
          </div>

          <div className="font-sans text-xs sm:text-[13px] font-semibold text-[#176B45] tracking-wide mt-1 mb-2.5">
            {s.subtitle}
          </div>

          <p className="font-sans text-sm sm:text-[14.5px] text-[#2c2824] leading-[1.68] font-normal">
            {s.description}
          </p>

          {/* Attractive Key Action Box */}
          <div className="mt-3.5 pt-3 border-t border-[#f0eae0] flex items-center gap-2 bg-[#faf7f2] px-3 py-2 rounded-xl border">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.accentColor }} />
            <span className="font-sans text-xs font-semibold text-[#2a241c]">
              <strong className="text-[#176B45] font-bold mr-1">{t('landing.patentProcess.keyActionLabel')}</strong>
              {s.keyAction}
            </span>
          </div>
        </div>

        {/* 3. Official Statute Footer */}
        <div className="flex items-center justify-between border-t border-[#ece4d4] pt-3 mt-4 text-[10px] sm:text-[10.5px] text-[#6d6455] uppercase tracking-wider font-mono">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.accentColor }} />
            {s.statuteRef}
          </span>
          <span className="text-[#176B45] font-bold">
            {t('landing.patentProcess.patentsActRef')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <section
      ref={containerRef}
      id="patent-process"
      data-theme="light"
      className="relative w-full bg-[#faf8f3] text-[#1c1a17] py-16 sm:py-24 select-none overflow-hidden"
    >
      {/* Archival Grid Canvas */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#2a2015_1px,transparent_1px)] [background-size:24px_24px] -z-10" />

      {/* TOP EDITORIAL HEADER */}
      <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#176B45]/10 border border-[#176B45]/25 mb-3.5 text-[#176B45] text-xs font-bold tracking-wider uppercase font-sans">
          {t('landing.patentProcess.badge')}
        </div>
        <h2 className="font-sans text-[clamp(2.1rem,3.8vw,3.15rem)] font-extrabold text-[#161412] tracking-tight leading-tight">
          {t('landing.patentProcess.heading')}
        </h2>
        <p className="font-sans text-sm sm:text-base text-[#524b3e] mt-3 font-normal max-w-2xl mx-auto leading-relaxed">
          {t('landing.patentProcess.subtitle')}
        </p>
      </div>

      {/* CENTRAL TIMELINE CONTAINER */}
      <div className="relative w-full max-w-5xl mx-auto px-6 sm:px-8">
        {/* Continuous Central Vertical Line */}
        <div
          className="absolute top-4 bottom-4 left-6 sm:left-8 md:left-1/2 -translate-x-1/2 w-[1.5px] bg-[#ded5c3] pointer-events-none"
          aria-hidden="true"
        />

        {/* Alternating Steps: Step 1 Left, Step 2 Right, Step 3 Left, Step 4 Right, Step 5 Left, Step 6 Right */}
        <div className="flex flex-col gap-4 sm:gap-5 md:gap-5 lg:gap-6">
          {PROCESS_STEPS.map((s, index) => {
            const isLeft = index % 2 === 0

            return (
              <div
                key={s.step}
                className="relative flex items-center w-full"
              >
                {/* Central Node on the vertical line */}
                <div
                  ref={(el) => (nodesRef.current[index] = el)}
                  className="absolute left-6 sm:left-8 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#fcfaf5] border-2 border-[#ded5c3] flex items-center justify-center z-10 transition-all duration-300 shadow-xs"
                  aria-hidden="true"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#176B45]" />
                </div>

                {/* Alternating Row Grid */}
                <div className="w-full pl-12 sm:pl-16 md:pl-0 grid grid-cols-1 md:grid-cols-2 md:gap-16 items-center">
                  {/* Left Column */}
                  <div className={`w-full ${isLeft ? 'flex md:justify-end' : 'hidden md:flex md:invisible pointer-events-none'}`}>
                    {isLeft && renderCard(s, index, 'left')}
                  </div>

                  {/* Right Column */}
                  <div className={`w-full ${!isLeft ? 'flex md:justify-start' : 'hidden md:flex md:invisible pointer-events-none'}`}>
                    {!isLeft && renderCard(s, index, 'right')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BOTTOM APPLICATION CTA & OFFICIAL PORTAL LINK */}
      <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 mt-6 sm:mt-8">
        <div className="border-t border-[#ded7c7] pt-8 sm:pt-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h4 className="font-sans text-lg sm:text-xl text-[#161412] font-bold leading-snug">
              {t('landing.patentProcess.ctaHeading')}
            </h4>
            <p className="font-sans text-xs sm:text-[13.5px] text-[#554d3f] leading-relaxed mt-1 max-w-lg font-normal">
              {t('landing.patentProcess.ctaDesc')}
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end shrink-0">
            <a
              href="https://ipronline.ipindia.gov.in/epatentfiling/goForLogin/doLogin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#176B45] hover:bg-[#1f8757] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-full shadow-[0_4px_16px_rgba(23,107,69,0.22)] hover:shadow-[0_6px_20px_rgba(23,107,69,0.3)] transition-all duration-200 cursor-pointer border border-[#279d67]/30 font-sans"
            >
              <span>{t('landing.patentProcess.ctaButton')}</span>
              <span className="text-sm">→</span>
            </a>
            <span className="text-[10px] text-[#786e5e] uppercase tracking-widest mt-1.5 font-mono font-medium">
              {t('landing.patentProcess.ctaBadge')}
            </span>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="w-full text-center text-[10.5px] text-[#857b6d] pt-8 font-sans">
          {t('landing.patentProcess.disclaimer')}
        </div>
      </div>
    </section>
  )
}

