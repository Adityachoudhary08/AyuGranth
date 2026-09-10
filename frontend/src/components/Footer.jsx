import { motion } from 'framer-motion'

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="relative w-full bg-[#080807] text-white overflow-hidden border-t border-white/10 select-none">
      {/* Subtle Background Radial Highlights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[#176B45]/[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-[#8e682c]/[0.02] rounded-full blur-3xl pointer-events-none" />

      {/* Giant Archival Watermark Typo */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 pointer-events-none select-none overflow-hidden whitespace-nowrap opacity-[0.028]">
        <span className="font-serif text-[clamp(6rem,14vw,16rem)] font-bold tracking-tight text-white">
          AAYUGRANTH
        </span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-20 sm:pt-24 pb-12">
        {/* Top Section: Sovereign Archival Heading Banner */}
        <div className="pb-14 border-b border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#176B45]/15 border border-[#176B45]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5dbb84] shadow-[0_0_8px_#5dbb84]" />
              <span className="text-[10px] font-mono font-semibold tracking-[0.2em] text-[#78d09e] uppercase">
                SOVEREIGN KNOWLEDGE COMMONS
              </span>
            </div>
            <h3 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-normal text-white leading-tight tracking-[-0.015em]">
              Preserving Ancient Wisdom. <br />
              <span className="text-white/40">Defending Irrevocable Heritage.</span>
            </h3>
          </div>


        </div>

        {/* Middle Section: Main Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 py-14 border-b border-white/[0.08]">
          {/* Brand & Purpose Column */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <a
                href="#home"
                className="inline-flex items-center gap-2.5 font-serif text-2xl font-normal tracking-tight text-white hover:opacity-90 transition-opacity"
              >
                <span>AayuGranth</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5dbb84] shadow-[0_0_10px_#5dbb84]" />
              </a>
              <p className="text-sm text-white/60 leading-relaxed font-normal max-w-sm">
                A sovereign digital knowledge archive synthesizing classical Ayurvedic science with modern intellectual property documentation. Dedicated to defensive protection, statutory clearance, and preventing illicit biopiracy.
              </p>
            </div>


          </div>

          {/* Directory Column 1: Archival Jurisprudence */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="text-[11px] font-mono font-semibold tracking-[0.2em] text-white/40 uppercase">
              STATUTORY CLEARANCE &amp; ARCHIVE
            </h4>
            <ul className="space-y-3 text-sm font-normal text-white/70">
              <li>
                <a
                  href="#why-it-matters"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>Section 3(p) Traditional Knowledge Exclusions</span>
                </a>
              </li>
              <li>
                <a
                  href="#patent-process"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>Form 1 &amp; Form 2 Patent Specification</span>
                </a>
              </li>
              <li>
                <a
                  href="#traditional-knowledge-ip"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>TKDL Prior-Art Concordance</span>
                </a>
              </li>
              <li>
                <a
                  href="#patent-process"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>Biological Material Source Declarations</span>
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>Letters Patent &amp; 20-Year Grant Terms</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Directory Column 2: Navigation & Quick Jump */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[11px] font-mono font-semibold tracking-[0.2em] text-white/40 uppercase">
              DIRECTORY
            </h4>
            <ul className="space-y-3 text-sm font-normal text-white/70">
              <li>
                <a
                  href="#home"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>Home</span>
                </a>
              </li>
              <li>
                <a
                  href="#why-it-matters"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>Why It Matters</span>
                </a>
              </li>
              <li>
                <a
                  href="#patent-process"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>Patent Process</span>
                </a>
              </li>
              <li>
                <a
                  href="#traditional-knowledge-ip"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>Traditional Knowledge</span>
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="group inline-flex items-center gap-2 hover:text-white transition-colors"
                >
                  <span className="text-white/30 group-hover:text-[#5dbb84] group-hover:translate-x-0.5 transition-all">→</span>
                  <span>FAQ &amp; Inquiries</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Colophon Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs font-normal text-white/50">
          <div className="text-center sm:text-left space-y-1">
            <div>
              © {new Date().getFullYear()} AayuGranth. Preserving ancient Indian heritage through modern intellectual property.
            </div>
            <div className="text-[11px] text-white/35 font-mono">
              28°36'50"N 77°12'32"E · NEW DELHI, BHARAT · PUBLIC DOMAIN CONCORDANCE
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              ARCHIVE STATUS · ACTIVE
            </span>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToTop}
              className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white text-xs px-4 py-2 rounded-full border border-white/10 transition-colors cursor-pointer"
            >
              <span>Back to Top</span>
              <span className="text-sm leading-none">↑</span>
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  )
}
