import { useId, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const FAQS = [
  {
    id: '01',
    category: 'Archive Overview',
    tag: 'FOUNDATIONAL REPOSITORY',
    question: 'What is AayuGranth?',
    answer:
      'AayuGranth is a digital knowledge archive that brings together documented Indian traditional knowledge and intellectual property information. It helps users understand traditional knowledge, its documentation and its relationship with modern innovation and protection.',
  },
  {
    id: '02',
    category: 'Defensive Rights',
    tag: 'SECTION 3(P) EXCLUSION',
    question: 'Why does traditional knowledge need protection?',
    answer:
      'Traditional knowledge can be vulnerable to misuse, misappropriation and claims based on knowledge that has existed for generations. Proper documentation helps establish evidence of existing knowledge and supports defensive protection against inappropriate intellectual property claims.',
  },
  {
    id: '03',
    category: 'Search & Concordance',
    tag: 'PRIOR-ART CLEARANCE',
    question: 'How can AayuGranth help with patent research?',
    answer:
      'AayuGranth helps users understand existing traditional knowledge and identify relevant prior art sources before pursuing an innovation. This can provide useful context for researchers, innovators and applicants conducting preliminary patent research.',
  },
  {
    id: '04',
    category: 'Statutory Procedure',
    tag: 'PATENTS ACT 1970',
    question: 'What is the Indian patent process?',
    answer:
      'The Indian patent process generally involves preparing and filing a patent application, examination by the Indian Patent Office, responding to examination requirements and proceeding toward grant when the legal requirements are satisfied. AayuGranth provides educational information to help users understand this process.',
  },
  {
    id: '05',
    category: 'Legal Jurisprudence',
    tag: 'NOVELTY ASSESSMENT',
    question: 'Can traditional Ayurvedic knowledge be patented?',
    answer:
      'Traditional knowledge that is already publicly known generally cannot be claimed as a new invention simply by repackaging it. However, genuinely new and inventive developments involving traditional knowledge may raise separate intellectual property questions and should be evaluated under the applicable patent requirements.',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0)
  const sectionId = useId()

  return (
    <section
      id="faq"
      data-theme="light"
      className="relative w-full bg-[#faf7f2] text-[#161412] px-6 sm:px-10 lg:px-16 py-20 sm:py-28 md:py-32 border-t border-[#e8dfcf] overflow-hidden select-none"
      aria-labelledby={`${sectionId}-heading`}
    >
      {/* Subtle Archival Ledger Texture Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#2a2015_1px,transparent_1px)] [background-size:24px_24px]" />
      
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute -top-40 right-10 w-96 h-96 bg-[#176B45]/[0.035] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-10 w-96 h-96 bg-[#8e682c]/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Asymmetric Editorial Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Sticky Editorial Context & Ledger Header */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-[#176B45]/10 border border-[#176B45]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#176B45]" />
              <span className="text-[10px] sm:text-[10.5px] font-mono font-semibold tracking-[0.22em] text-[#176B45] uppercase">
                ARCHIVAL DISCLOSURE
              </span>
            </div>

            <h2
              id={`${sectionId}-heading`}
              className="font-serif text-[clamp(2.2rem,4vw,3.6rem)] font-normal text-[#161412] leading-[1.08] tracking-[-0.025em] mb-5"
            >
              Questions Worth <span className="italic text-[#176B45]">Knowing.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#524c44] leading-relaxed font-normal mb-8 max-w-md">
              Essential principles governing traditional knowledge documentation, defensive publication, and Indian intellectual property rights.
            </p>

          </div>

          {/* Right Column: High-End Interactive Accordion */}
          <div className="lg:col-span-7 space-y-3.5">
            {FAQS.map((faq, index) => {
              const expanded = openIndex === index
              const answerId = `${sectionId}-answer-${index}`

              return (
                <div
                  key={faq.question}
                  className={`group rounded-2xl transition-all duration-300 border ${
                    expanded
                      ? 'bg-white border-[#176B45]/40 shadow-[0_10px_32px_-8px_rgba(23,107,69,0.08)]'
                      : 'bg-white/60 hover:bg-white border-[#e6ded1] hover:border-[#d5cbbd] shadow-[0_2px_8px_rgba(0,0,0,0.015)]'
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 p-5 sm:p-6 text-left cursor-pointer select-none"
                    aria-expanded={expanded}
                    aria-controls={answerId}
                    onClick={() => setOpenIndex(expanded ? null : index)}
                  >
                    <div className="flex items-start gap-4 sm:gap-5 flex-1">
                      {/* Numeral Badge */}
                      <span
                        className={`shrink-0 font-mono text-xs sm:text-sm font-semibold tracking-wider transition-colors duration-200 mt-1 ${
                          expanded ? 'text-[#176B45]' : 'text-[#8c8273] group-hover:text-[#176B45]'
                        }`}
                      >
                        {faq.id}
                      </span>

                      {/* Question Content */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.16em] text-[#8c8273]">
                            {faq.category}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg sm:text-xl font-normal text-[#161412] group-hover:text-[#176B45] transition-colors duration-200 leading-snug tracking-[-0.01em]">
                          {faq.question}
                        </h3>
                      </div>
                    </div>

                    {/* Tactile Toggle Button */}
                    <div
                      className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 mt-0.5 ${
                        expanded
                          ? 'bg-[#176B45] text-white rotate-45 shadow-[0_4px_12px_rgba(23,107,69,0.3)]'
                          : 'bg-[#f4efe6] text-[#524c44] group-hover:bg-[#ebe3d7] group-hover:text-[#161412]'
                      }`}
                      aria-hidden="true"
                    >
                      <svg
                        className="w-4 h-4 transition-transform duration-300"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                  </button>

                  {/* Silky Hardware-Accelerated Answer Expansion */}
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        id={answerId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-1">
                          <div className="pl-8 sm:pl-10 border-l-2 border-[#176B45]/30 ml-2 space-y-3.5">
                            <p className="text-sm sm:text-[15px] leading-relaxed text-[#4a443c] font-normal">
                              {faq.answer}
                            </p>
                            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase text-[#176B45] bg-[#176B45]/5 px-2.5 py-1 rounded-md">
                              <span className="w-1 h-1 rounded-full bg-[#176B45]" />
                              <span>{faq.tag}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
