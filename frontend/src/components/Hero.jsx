import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  heroContainerVariants,
  eyebrowVariants,
  headingLineVariants,
  descriptionVariants,
  ctaContainerVariants,
  featuresVariants,
  scrollIndicatorVariants,
  initHeroParallax,
} from '../animations/heroAnimations'

export default function Hero() {
  const heroRef = useRef(null)
  const bgRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    const ctx = initHeroParallax(heroRef.current, bgRef.current, contentRef.current)
    return () => {
      if (ctx) ctx.revert()
    }
  }, [])

  return (
    <section
      id="home"
      ref={heroRef}
      data-theme="light"
      className="relative w-full h-screen h-[100dvh] min-h-[680px] flex flex-col justify-between overflow-hidden bg-[#faf8f3] text-[#161412] select-none"
    >
      {/* 1. HERO BACKGROUND: NATURAL DAYLIGHT PHOTO ON RIGHT DISSOLVING INTO WARM IVORY CANVASS ON LEFT */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Faint Botanical Herbal Leaf Watermark on Left Margin */}
        <div className="absolute -left-10 top-0 bottom-0 w-80 lg:w-[420px] pointer-events-none opacity-[0.14] overflow-hidden z-0 flex items-center">
          <svg
            className="w-full h-[90%] text-[#7c705a]"
            viewBox="0 0 320 600"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M60,600 C80,480 120,380 90,260 C70,180 30,120 40,30" />
            <path d="M90,260 C150,240 180,180 160,120 C140,70 100,60 85,95 C75,120 78,170 90,260 Z" />
            <path d="M85,95 C120,130 145,170 160,120" />
            <path d="M100,340 C170,330 210,280 200,220 C190,170 140,160 120,190 C105,215 102,260 100,340 Z" />
            <path d="M120,190 C160,220 185,260 200,220" />
            <path d="M80,420 C150,430 190,390 195,330 C200,280 150,270 125,295 C108,320 95,360 80,420 Z" />
            <path d="M125,295 C160,330 180,360 195,330" />
            <path d="M65,490 C130,510 170,480 175,420 C180,370 135,360 115,385 C100,405 85,440 65,490 Z" />
            <path d="M50,160 C10,130 -10,80 5,30 C20, -10 60,0 70,35 C78,60 70,110 50,160 Z" />
            <path d="M55,300 C15,280 -10,230 0,180 C10,130 50,130 65,160 C75,185 70,240 55,300 Z" />
          </svg>
        </div>

        {/* Full-bleed Hero Photographic Background matching reference */}
        <div
          ref={bgRef}
          className="absolute inset-0 w-full h-full will-change-transform"
        >
          <img
            src="/hero-section-bg.png"
            alt="AayuGranth Sovereign Ayurvedic Knowledge and Indian Patent Protection"
            className="w-full h-full object-cover object-[82%_58%] lg:object-[80%_56%]"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width="1672"
            height="941"
          />
        </div>
      </div>

      {/* 2. MAIN HERO CONTENT AREA */}
      <div
        ref={contentRef}
        className="relative z-10 w-full max-w-[1460px] mx-auto px-6 sm:px-10 lg:px-16 flex-1 flex flex-col justify-between pt-22 sm:pt-24 md:pt-26 pb-5 sm:pb-6 will-change-transform"
      >
        <motion.div
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="w-full flex-1 flex flex-col justify-between"
        >
          {/* Main Content Column */}
          <div className="relative my-auto pt-2 pb-4">
            <div className="w-full max-w-[590px] text-left">
              {/* Eyebrow / Heritage Category Tag */}
              <motion.div
                variants={eyebrowVariants}
                className="mb-3.5 sm:mb-4 inline-flex items-center"
              >
                <span className="text-[11px] sm:text-[11.5px] font-semibold tracking-[0.26em] text-[#7d705c] uppercase font-sans">
                  BHARAT KI GYAAN PARAMPARA
                </span>
              </motion.div>

              {/* Main Headline */}
              <h1 className="font-helvetica text-[clamp(2.35rem,4.4vw,3.95rem)] font-normal sm:font-medium leading-[1.08] text-[#161412] tracking-[-0.03em] mb-4 sm:mb-5">
                <motion.span variants={headingLineVariants} className="block text-[#161412]">
                  Preserve
                </motion.span>
                <motion.span variants={headingLineVariants} className="block text-[#176B45]">
                  Ayurvedic Knowledge.
                </motion.span>
                <motion.span variants={headingLineVariants} className="block text-[#161412]">
                  Enable a Safer Tomorrow.
                </motion.span>
              </h1>

              {/* Subtitle */}
              <motion.p
                variants={descriptionVariants}
                className="text-[#4e483e] text-xs sm:text-sm lg:text-[0.98rem] leading-relaxed max-w-[490px] font-normal mb-7 sm:mb-8"
              >
                Explore India&apos;s traditional knowledge, understand patents, and get the guidance you need to protect what matters.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                variants={ctaContainerVariants}
                className="flex flex-wrap items-center gap-3.5 mb-7 sm:mb-9"
              >
                {/* Primary CTA */}
                <Link
                  to="/ask-aayugranth"
                  className="group inline-flex items-center justify-center gap-2.5 bg-[#176B45] hover:bg-[#1f8757] text-white text-xs sm:text-sm font-medium px-6 sm:px-7 py-3 rounded-full shadow-[0_4px_18px_rgba(23,107,69,0.25)] transition-all duration-200 cursor-pointer"
                >
                  <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Ask AayuGranth</motion.span>
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>

                {/* Secondary CTA */}
                <motion.a
                  href="#patent-process"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2.5 bg-white/70 hover:bg-white text-[#161412] text-xs sm:text-sm font-medium px-6 sm:px-7 py-3 rounded-full border border-[#161412]/20 hover:border-[#161412]/35 shadow-xs transition-all duration-200 cursor-pointer"
                >
                  <span>Learn More</span>
                </motion.a>
              </motion.div>

              {/* Feature Badges under the buttons with dividers */}
              <motion.div
                variants={featuresVariants}
                className="flex items-center pt-2 max-w-[530px]"
              >
                {/* Feature 1: Traditional Knowledge */}
                <div className="flex items-start gap-2.5 pr-5 sm:pr-7 border-r border-[#161412]/15">
                  <div className="text-[#161412] mt-0.5 shrink-0">
                    <svg
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                    </svg>
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.16em] text-[#161412] uppercase leading-tight font-sans">
                    <div>TRADITIONAL</div>
                    <div>KNOWLEDGE</div>
                  </div>
                </div>

                {/* Feature 2: Intellectual Property */}
                <div className="flex items-start gap-2.5 px-5 sm:px-7 border-r border-[#161412]/15">
                  <div className="text-[#161412] mt-0.5 shrink-0">
                    <svg
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.16em] text-[#161412] uppercase leading-tight font-sans">
                    <div>INTELLECTUAL</div>
                    <div>PROPERTY</div>
                  </div>
                </div>

                {/* Feature 3: A Healthier Tomorrow */}
                <div className="flex items-start gap-2.5 pl-5 sm:pl-7">
                  <div className="text-[#161412] mt-0.5 shrink-0">
                    <svg
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.16em] text-[#161412] uppercase leading-tight font-sans">
                    <div>A HEALTHIER</div>
                    <div>TOMORROW</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* 3. BOTTOM BAR: TRICOLOR PILL & NATIONAL TAGLINE */}
          <div className="w-full relative flex items-center justify-between pt-4 pb-1 border-t border-[#161412]/10">
            {/* Left Tagline with Tricolor Bars */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                <span className="w-4 sm:w-5 h-1 rounded-full bg-[#FF9933]" />
                <span className="w-4 sm:w-5 h-1 rounded-full bg-white border border-[#d6cec2]" />
                <span className="w-4 sm:w-5 h-1 rounded-full bg-[#138808]" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium tracking-[0.2em] text-[#7d705c] uppercase font-sans">
                ROOTED IN INDIA <span className="mx-1.5 opacity-40">|</span> GUIDED BY AYURVEDA <span className="mx-1.5 opacity-40">|</span> FOR A HEALTHIER TOMORROW
              </span>
            </div>

            {/* Scroll Indicator */}
            <motion.div
              variants={scrollIndicatorVariants}
              className="flex items-center justify-center"
            >
              <motion.a
                href="#knowledge-dna"
                animate={{ y: [0, 4, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'easeInOut',
                }}
                className="w-6 h-6 rounded-full border border-[#161412]/20 hover:border-[#161412]/50 bg-white/70 flex items-center justify-center text-[#161412]/60 hover:text-[#161412] transition-colors cursor-pointer shadow-xs"
                aria-label="Scroll down"
              >
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </motion.a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
