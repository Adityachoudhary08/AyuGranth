import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function KnowledgeDNASection() {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const stickyRef = useRef(null)
  const canvasContainerRef = useRef(null)
  const helixInstanceRef = useRef(null)
  const progressRef = useRef(0)
  const progressLabelRef = useRef(null)

  // Current narrative stage (0, 1, or 2) driven by scroll progress
  const [stageIndex, setStageIndex] = useState(0)

  const STAGES = [
    {
      id: '01',
      topRight: {
        folio: t('landing.dna.stage1.folio'),
        title: t('landing.dna.stage1.topTitle'),
        description: t('landing.dna.stage1.topDesc'),
        statusTag: 'TAXONOMY ACTIVE',
      },
      leftCenter: {
        eyebrow: t('landing.dna.eyebrow'),
        titleLine1: t('landing.dna.stage1.titleLine1'),
        titleLine2: t('landing.dna.stage1.titleLine2'),
        description: t('landing.dna.stage1.mainDesc'),
        badges: [
          { label: t('landing.dna.stage1.badge1'), icon: '✦' },
          { label: t('landing.dna.stage1.badge2'), icon: '❖' },
        ],
      },
      bottomRight: {
        category: t('landing.dna.stage1.bottomCategory'),
        quote: t('landing.dna.stage1.bottomQuote'),
        status: t('landing.dna.stage1.bottomStatus'),
        metric: t('landing.dna.stage1.bottomMetric'),
      },
    },
    {
      id: '02',
      topRight: {
        folio: t('landing.dna.stage2.folio'),
        title: t('landing.dna.stage2.topTitle'),
        description: t('landing.dna.stage2.topDesc'),
        statusTag: 'PREEMPTIVE SHIELD',
      },
      leftCenter: {
        eyebrow: t('landing.dna.eyebrow'),
        titleLine1: t('landing.dna.stage2.titleLine1'),
        titleLine2: t('landing.dna.stage2.titleLine2'),
        description: t('landing.dna.stage2.mainDesc'),
        badges: [
          { label: t('landing.dna.stage2.badge1'), icon: '✦' },
          { label: t('landing.dna.stage2.badge2'), icon: '❖' },
        ],
      },
      bottomRight: {
        category: t('landing.dna.stage2.bottomCategory'),
        quote: t('landing.dna.stage2.bottomQuote'),
        status: t('landing.dna.stage2.bottomStatus'),
        metric: t('landing.dna.stage2.bottomMetric'),
      },
    },
    {
      id: '03',
      topRight: {
        folio: t('landing.dna.stage3.folio'),
        title: t('landing.dna.stage3.topTitle'),
        description: t('landing.dna.stage3.topDesc'),
        statusTag: 'SOVEREIGN TRUST',
      },
      leftCenter: {
        eyebrow: t('landing.dna.eyebrow'),
        titleLine1: t('landing.dna.stage3.titleLine1'),
        titleLine2: t('landing.dna.stage3.titleLine2'),
        description: t('landing.dna.stage3.mainDesc'),
        badges: [
          { label: t('landing.dna.stage3.badge1'), icon: '✦' },
          { label: t('landing.dna.stage3.badge2'), icon: '❖' },
        ],
      },
      bottomRight: {
        category: t('landing.dna.stage3.bottomCategory'),
        quote: t('landing.dna.stage3.bottomQuote'),
        status: t('landing.dna.stage3.bottomStatus'),
        metric: t('landing.dna.stage3.bottomMetric'),
      },
    },
  ]

  useEffect(() => {
    const container = containerRef.current
    const canvasContainer = canvasContainerRef.current
    if (!container || !canvasContainer) return

    let isDisposed = false
    let isInitialized = false

    // Asynchronously initialize the Three.js Botanical DNA Helix immediately
    const loadAndInitHelix = async () => {
      if (helixInstanceRef.current || isInitialized || isDisposed) return
      isInitialized = true
      try {
        const { initBotanicalDNA } = await import('./BotanicalDNAHelix')
        if (isDisposed || !canvasContainerRef.current) return
        const helix = await initBotanicalDNA(canvasContainerRef.current)
        if (isDisposed) {
          helix.destroy()
          return
        }
        helixInstanceRef.current = helix
        helix.setScrollProgress(progressRef.current)
        const currentRect = container.getBoundingClientRect()
        const isNear = currentRect.top < window.innerHeight + 800 && currentRect.bottom > -800
        helix.setActive(isNear)
      } catch (err) {
        console.error('Failed to load BotanicalDNAHelix:', err)
      }
    }

    // Launch immediately on mount
    loadAndInitHelix()

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (helixInstanceRef.current) {
          helixInstanceRef.current.setActive(entry.isIntersecting)
        }
      },
      { rootMargin: '600px 0px', threshold: 0 }
    )
    visibilityObserver.observe(container)

    // GSAP ScrollTrigger to scrub helix rotation and update narrative stage
    const trigger = ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.35,
      onUpdate: (self) => {
        const p = self.progress
        progressRef.current = p
        if (progressLabelRef.current) {
          progressLabelRef.current.textContent = `${Math.round(p * 100)}%`
        }

        if (helixInstanceRef.current) {
          helixInstanceRef.current.setScrollProgress(p)
        }

        // Map scroll progress to narrative stage (0, 1, 2)
        let nextStage = 0
        if (p >= 0.65) {
          nextStage = 2
        } else if (p >= 0.32) {
          nextStage = 1
        } else {
          nextStage = 0
        }

        setStageIndex((prev) => (prev !== nextStage ? nextStage : prev))
      },
    })

    return () => {
      isDisposed = true
      visibilityObserver.disconnect()
      trigger.kill()
      if (helixInstanceRef.current) {
        helixInstanceRef.current.destroy()
        helixInstanceRef.current = null
      }
    }
  }, [])

  const currentData = STAGES[stageIndex]

  return (
    <section
      ref={containerRef}
      id="knowledge-dna"
      data-theme="light"
      className="relative w-full h-[280vh] bg-[#f9f6f0] text-[#161412] select-none"
    >
      {/* Pinned 100vh Viewport */}
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen h-[100dvh] w-full overflow-hidden bg-[#f9f6f0] flex flex-col justify-between"
      >
        {/* 1. Full-screen 3D Botanical Helix Canvas */}
        <div
          ref={canvasContainerRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
        />

        {/* Subtle Ambient Vignette Framing */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(249,246,240,0.75)_100%)] z-1" />

        {/* 2. THREE-ANCHOR EDITORIAL TYPOGRAPHY OVERLAY */}

        {/* === ANCHOR 1: TOP RIGHT CORNER (Moved to extreme right edge) === */}
        <div className="absolute top-16 sm:top-20 right-3 sm:right-6 md:right-8 lg:right-10 text-right z-10 max-w-[250px] sm:max-w-[280px] md:max-w-[320px] pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={`top-right-${stageIndex}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-end"
            >
              {/* Folio & Status Badge */}
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-[#176B45]/8 border border-[#176B45]/20 rounded-full mb-2 backdrop-blur-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#176B45] animate-pulse" />
                <span className="text-[9.5px] sm:text-[10.5px] font-mono font-semibold tracking-[0.18em] text-[#176B45] uppercase">
                  {currentData.topRight.folio}
                </span>
              </div>

              {/* Title */}
              <h4 className="font-serif text-xs sm:text-sm md:text-base font-medium text-[#161412] tracking-tight">
                {currentData.topRight.title}
              </h4>

              {/* Sub-description */}
              <p className="mt-1 text-[11px] sm:text-xs text-[#554e44] leading-relaxed font-sans">
                {currentData.topRight.description}
              </p>

              {/* Chapter Indicator Bar */}
              <div className="mt-2.5 flex items-center gap-1.5">
                {STAGES.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx === stageIndex
                        ? 'w-6 bg-[#176B45]'
                        : idx < stageIndex
                        ? 'w-2.5 bg-[#176B45]/40'
                        : 'w-2.5 bg-[#161412]/15'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* === ANCHOR 2: LEFT CENTER (Moved to extreme left edge, compact width) === */}
        <div className="absolute left-3 sm:left-6 md:left-8 lg:left-10 top-1/2 -translate-y-1/2 z-10 w-full max-w-[270px] sm:max-w-[310px] md:max-w-[350px] lg:max-w-[380px] pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={`left-center-${stageIndex}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Small Label */}
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#176B45]" />
                <span className="text-[9.5px] sm:text-[10.5px] font-semibold tracking-[0.22em] text-[#3d5a45] uppercase font-mono">
                  {currentData.leftCenter.eyebrow}
                </span>
                <span className="text-[9.5px] text-[#8c8275] font-mono tracking-widest">
                  [{currentData.id}/03]
                </span>
              </div>

              {/* Main Headline */}
              <h2 className="font-serif text-[clamp(1.65rem,2.4vw,2.45rem)] font-normal text-[#161412] tracking-[-0.025em] leading-[1.1]">
                {currentData.leftCenter.titleLine1}
                <span className="block text-[#176B45] italic font-normal">
                  {currentData.leftCenter.titleLine2}
                </span>
              </h2>

              {/* Editorial Sub-copy */}
              <p className="mt-3 text-xs sm:text-[13px] text-[#423d35] leading-relaxed font-sans">
                {currentData.leftCenter.description}
              </p>

              {/* Evidence Badges */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#161412]/10">
                {currentData.leftCenter.badges.map((b) => (
                  <div
                    key={b.label}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#f7f5f0] border border-[#161412]/8 text-[10.5px] sm:text-[11px] font-mono text-[#38332c]"
                  >
                    <span className="text-[#176B45] text-[9px]">{b.icon}</span>
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* === ANCHOR 3: BOTTOM RIGHT CORNER (Moved to extreme right edge) === */}
        <div className="absolute bottom-5 sm:bottom-8 right-3 sm:right-6 md:right-8 lg:right-10 z-10 max-w-[260px] sm:max-w-[290px] md:max-w-[330px] text-left pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={`bottom-right-${stageIndex}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/90 backdrop-blur-md border border-[#161412]/10 p-3.5 sm:p-4 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.06)] pointer-events-auto"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-[#161412]/6">
                <span className="text-[8.5px] sm:text-[9.5px] font-mono tracking-widest text-[#787168] uppercase">
                  {currentData.bottomRight.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[8px] sm:text-[8.5px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {currentData.bottomRight.status}
                </span>
              </div>

              {/* Quote Statement */}
              <p className="font-serif italic text-[11px] sm:text-xs text-[#2c2824] leading-relaxed font-normal">
                {currentData.bottomRight.quote}
              </p>

              {/* Metric Footer */}
              <div className="mt-2 pt-1.5 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-[#8a8275]">
                <span>{currentData.bottomRight.metric}</span>
                <span className="text-[#176B45] font-semibold tracking-wider">
                  {t('landing.dna.defenseActive')}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Left Minimal Progress Folio */}
        <div className="absolute bottom-5 sm:bottom-8 left-3 sm:left-6 md:left-8 lg:left-10 z-10 pointer-events-none hidden sm:flex items-center gap-2.5 text-[9.5px] font-mono text-[#787168] tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full border border-[#176B45]" />
          <span>{t('landing.dna.scrollHint')}<span ref={progressLabelRef}>0%</span></span>
        </div>
      </div>
    </section>
  )
}

