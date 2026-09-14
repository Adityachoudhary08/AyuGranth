import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function WhatIsPatentSection() {
  const { t } = useTranslation()

  return (
    <section
      id="why-it-matters"
      data-theme="light"
      className="relative w-full bg-[#f9f6f0] text-[#1c1a17] pt-8 sm:pt-10 md:pt-12 pb-6 sm:pb-8 px-6 sm:px-12 md:px-16 lg:px-24 overflow-hidden"
    >
      {/* Subtle Archival Texture & Watermark */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] bg-[radial-gradient(#2a2015_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* ============================================================ */}
        {/* PART 1: WHAT IS A PATENT?                                    */}
        {/* ============================================================ */}
        <div className="mb-6 sm:mb-8">
          {/* Small Top Label */}
          <div className="inline-flex items-center gap-2 mb-2 sm:mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#942a22]" />
            <span className="text-[10.5px] sm:text-[11px] font-semibold tracking-[0.26em] text-[#8e2b24] uppercase">
              {t('landing.whatIsPatent.label')}
            </span>
          </div>

          {/* Large Serif Heading */}
          <h2 className="font-serif text-[clamp(2.2rem,4.4vw,3.8rem)] font-normal text-[#161412] tracking-[-0.02em] leading-[1.08] mb-5 sm:mb-6 max-w-3xl">
            {t('landing.whatIsPatent.heading')}
          </h2>

          {/* Two-Column Editorial Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
            {/* Left Statement (Large Editorial Quote) */}
            <div className="lg:col-span-7">
              <p className="font-serif text-[clamp(1.25rem,2.2vw,1.85rem)] text-[#241f1a] font-normal leading-[1.38] tracking-[-0.01em]">
                {t('landing.whatIsPatent.quote')}
              </p>
              <div className="w-16 h-[1.5px] bg-[#942a22]/60 mt-4" />
            </div>

            {/* Right Concise Explanation */}
            <div className="lg:col-span-5 lg:pt-1">
              <p className="font-sans text-sm sm:text-base text-[#524c44] leading-relaxed font-normal mb-3">
                {t('landing.whatIsPatent.desc1')}
              </p>
              <p className="font-sans text-xs sm:text-sm text-[#736c62] leading-relaxed">
                {t('landing.whatIsPatent.desc2')}
              </p>
            </div>
          </div>
        </div>

        {/* Thin Divider Line */}
        <div className="w-full h-[1px] bg-[#e2d8c7] my-6 sm:my-8" />

        {/* ============================================================ */}
        {/* PART 2: WHY DO WE NEED PATENTS?                              */}
        {/* ============================================================ */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-2 sm:mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#176B45]" />
            <span className="text-[10.5px] sm:text-[11px] font-semibold tracking-[0.26em] text-[#176B45] uppercase">
              {t('landing.whatIsPatent.whyLabel')}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 mb-6 sm:mb-8">
            {/* Large Heading */}
            <div className="lg:col-span-7">
              <h3 className="font-serif text-[clamp(2rem,3.8vw,3.2rem)] font-normal text-[#161412] tracking-[-0.015em] leading-[1.1]">
                {t('landing.whatIsPatent.whyHeading1')}
                <span className="block text-[#176B45] italic">
                  {t('landing.whatIsPatent.whyHeading2')}
                </span>
              </h3>
            </div>

            {/* Paragraph Explanation */}
            <div className="lg:col-span-5 lg:pt-2">
              <p className="font-sans text-base sm:text-lg text-[#524c44] leading-relaxed font-normal">
                {t('landing.whatIsPatent.whyDesc')}
              </p>
              <p className="font-sans text-xs text-[#827a6f] mt-3 leading-relaxed italic">
                {t('landing.whatIsPatent.whyNote')}
              </p>
            </div>
          </div>

          {/* Typography-based Editorial Principles (01, 02, 03) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 border-t border-[#e2d8c7] pt-6 sm:pt-7">
            {/* Item 01 */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="font-mono text-3xl sm:text-4xl text-[#942a22] font-semibold mb-2 sm:mb-3">
                  01
                </div>
                <h4 className="font-serif text-lg sm:text-xl font-medium text-[#1c1a17] mb-1.5 uppercase tracking-wide">
                  {t('landing.whatIsPatent.protectTitle')}
                </h4>
                <p className="font-sans text-sm text-[#5c544a] leading-relaxed">
                  {t('landing.whatIsPatent.protectDesc')}
                </p>
              </div>
              <div className="w-10 h-[1px] bg-[#942a22]/40 mt-4" />
            </div>

            {/* Item 02 */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="font-mono text-3xl sm:text-4xl text-[#176B45] font-semibold mb-2 sm:mb-3">
                  02
                </div>
                <h4 className="font-serif text-lg sm:text-xl font-medium text-[#1c1a17] mb-1.5 uppercase tracking-wide">
                  {t('landing.whatIsPatent.discloseTitle')}
                </h4>
                <p className="font-sans text-sm text-[#5c544a] leading-relaxed">
                  {t('landing.whatIsPatent.discloseDesc')}
                </p>
              </div>
              <div className="w-10 h-[1px] bg-[#176B45]/40 mt-4" />
            </div>

            {/* Item 03 */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="font-mono text-3xl sm:text-4xl text-[#8e682c] font-semibold mb-2 sm:mb-3">
                  03
                </div>
                <h4 className="font-serif text-lg sm:text-xl font-medium text-[#1c1a17] mb-1.5 uppercase tracking-wide">
                  {t('landing.whatIsPatent.commercialiseTitle')}
                </h4>
                <p className="font-sans text-sm text-[#5c544a] leading-relaxed">
                  {t('landing.whatIsPatent.commercialiseDesc')}
                </p>
              </div>
              <div className="w-10 h-[1px] bg-[#8e682c]/40 mt-4" />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PART 3: SCROLL TRANSITION TO NEXT SECTION                   */}
        {/* ============================================================ */}
        <div className="pt-4 sm:pt-6 flex flex-col items-center justify-center text-center">
          {/* Animated Downward Arrow */}
          <motion.a
            href="#patent-process"
            animate={{ y: [0, 4, 0] }}
            transition={{
              repeat: Infinity,
              duration: 2.0,
              ease: 'easeInOut',
            }}
            className="w-8 h-8 rounded-full border border-[#c4b9a5] hover:border-[#176B45] text-[#1c1a17] flex items-center justify-center text-sm mb-1.5 transition-colors cursor-pointer shadow-xs bg-[#f4efe4]"
            aria-label={t('landing.whatIsPatent.scrollAria')}
          >
            ↓
          </motion.a>

          {/* Subtitle invitation */}
          <div className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.24em] text-[#8e2b24] uppercase mb-0.5">
            {t('landing.whatIsPatent.scrollLabel')}
          </div>
          <p className="font-serif italic text-xs sm:text-sm text-[#5e564c]">
            {t('landing.whatIsPatent.scrollSub')}
          </p>
        </div>
      </div>
    </section>
  )
}

