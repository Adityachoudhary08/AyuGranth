import { useEffect, lazy, Suspense } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Navbar from './components/Navbar'
import Hero from './components/Hero'
import KnowledgeDNASection from './components/KnowledgeDNASection'

const WhatIsPatentSection = lazy(() => import('./components/WhatIsPatentSection'))
const PatentProcessSection = lazy(() => import('./components/PatentProcessSection'))
const TraditionalKnowledgeSection = lazy(() => import('./components/TraditionalKnowledgeSection'))
const FAQSection = lazy(() => import('./components/FAQSection'))
const Footer = lazy(() => import('./components/Footer'))

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1,
      anchors: true,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const tickerCb = (time) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tickerCb)
    gsap.ticker.lagSmoothing(500, 33)

    return () => {
      gsap.ticker.remove(tickerCb)
      lenis.destroy()
    }
  }, [])

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white selection:bg-[#176B45] selection:text-white">
      <Navbar />
      <main>
        {/* Section 1: Hero */}
        <Hero />

        {/* Section 2: The Knowledge DNA — 3D Botanical Helix */}
        <KnowledgeDNASection />

        <Suspense fallback={null}>
          {/* Section 3: Understanding Intellectual Property */}
          <WhatIsPatentSection />

          {/* Section 3: The Indian Patent Process */}
          <PatentProcessSection />

          {/* Section 4: Traditional Knowledge x IP */}
          <TraditionalKnowledgeSection />

          {/* Section 5: FAQ */}
          <FAQSection />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  )
}
