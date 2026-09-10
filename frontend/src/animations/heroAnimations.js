import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Centralized ScrollTrigger is registered once in App.jsx

const smoothEase = [0.16, 1, 0.3, 1]

// Reusable fadeUp variant generator
export const fadeUp = (delay = 0, y = 12, duration = 0.5, ease = smoothEase) => ({
  hidden: { opacity: 0, y },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration, delay, ease },
  },
})

// Framer Motion Variants for Hero & Navbar Elements

export const navContainerVariants = {
  hidden: { opacity: 0, y: -25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: smoothEase,
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
}

export const navItemVariants = fadeUp(0, -10, 0.5)

export const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

export const eyebrowVariants = fadeUp(0, 10, 0.45)
export const headingLineVariants = fadeUp(0, 14, 0.5)

export const highlightVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, delay: 0.05, ease: smoothEase },
  },
}

export const descriptionVariants = fadeUp(0.08, 12, 0.48)
export const ctaContainerVariants = fadeUp(0.12, 12, 0.48)
export const featuresVariants = fadeUp(0.16, 10, 0.48)

export const sideAccentVariants = {
  hidden: { opacity: 0, x: 15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, delay: 0.2, ease: smoothEase },
  },
}

export const scrollIndicatorVariants = fadeUp(0.25, 8, 0.5, 'easeOut')

// GSAP ScrollTrigger for Hero Parallax
export const initHeroParallax = (heroContainer, bgElement, contentElement) => {
  if (!heroContainer || !bgElement || !contentElement) return null

  const ctx = gsap.context(() => {
    // Parallax background: slow scale from 1 to 1.06 + subtle vertical translation
    gsap.to(bgElement, {
      scale: 1.06,
      yPercent: 4,
      ease: 'none',
      scrollTrigger: {
        trigger: heroContainer,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    })

    // Parallax content: moves upward slightly as specified (never alter opacity)
    gsap.to(contentElement, {
      y: -35,
      ease: 'none',
      scrollTrigger: {
        trigger: heroContainer,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    })
  }, heroContainer)

  return ctx
}
