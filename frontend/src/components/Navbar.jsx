
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { User, LogOut, LogIn, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { navContainerVariants, navItemVariants } from '../animations/heroAnimations'
import { useAuth } from '../context/AuthContext'
import i18n from '../i18n/index.js'

const LANGUAGES = [
  { code: 'en', label: 'English', script: 'latin' },
  { code: 'hi', label: 'हिन्दी', script: 'devanagari' },
  { code: 'ta', label: 'தமிழ்', script: 'tamil' },
  { code: 'te', label: 'తెలుగు', script: 'telugu' },
  { code: 'mr', label: 'मराठी', script: 'devanagari' },
]

export default function Navbar() {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aayugranth_lang') || 'en'
    }
    return 'en'
  })
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langDropdownRef = useRef(null)
  const lastScrollY = useRef(0)
  const isVisibleRef = useRef(true)

  const changeLang = (code) => {
    setSelectedLang(code)
    localStorage.setItem('aayugranth_lang', code)
    i18n.changeLanguage(code)
    document.documentElement.lang = code
  }

  // Sync i18n on mount in case localStorage was set before i18n initialised
  useEffect(() => {
    const saved = localStorage.getItem('aayugranth_lang') || 'en'
    if (i18n.language !== saved) {
      i18n.changeLanguage(saved)
    }
    document.documentElement.lang = saved
  }, [])

  const { user, isAuthenticated, logout } = useAuth()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setIsLangOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLangOpen(false)
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    let ticking = false

    const updateNavbar = () => {
      ticking = false
      const currentScrollY = window.scrollY

      let nextVisible = isVisibleRef.current
      if (currentScrollY < 60) {
        nextVisible = true
      } else if (currentScrollY > lastScrollY.current && currentScrollY - lastScrollY.current > 6) {
        nextVisible = false
        setMobileMenuOpen(false)
      } else if (currentScrollY < lastScrollY.current && lastScrollY.current - currentScrollY > 6) {
        nextVisible = true
      }

      if (isVisibleRef.current !== nextVisible) {
        isVisibleRef.current = nextVisible
        setIsVisible(nextVisible)
      }

      lastScrollY.current = currentScrollY
    }

    const handleScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updateNavbar)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const selectedLangObj = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[0]

  const navLinks = [
    { name: t('nav.myPassports'), href: '/passports', isHash: false },
    { name: t('nav.ipIntelligence'), href: '/ip-intelligence', isHash: false },
    { name: t('nav.absDuties'), href: '/abs', isHash: false },
    { name: t('nav.international'), href: '/international', isHash: false },
  ]


  return (
    <motion.header
      className="fixed top-5 left-0 right-0 z-50 px-6 sm:px-8 md:px-12 lg:px-16 pointer-events-none"
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={{
        visible: {
          y: 0,
          opacity: 1,
          transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        },
        hidden: {
          y: -90,
          opacity: 0,
          transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
        },
      }}
    >
      <div className="w-full max-w-[1460px] mx-auto flex items-center justify-between">
        {/* 1. LEFT: AayuGranth text on the leftmost side of screen */}
        <div className="flex-1 flex items-center justify-start pointer-events-auto">
          <Link
            to="/"
            variants={navItemVariants}
            className="flex items-center gap-2 font-semibold text-lg md:text-xl tracking-tight transition-colors duration-200 text-[#161412] hover:text-[#161412]/80"
          >
            <span>AayuGranth</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#176B45] shadow-[0_0_8px_#176B45]" />
          </Link>
        </div>

        {/* 2. CENTER: Transparent navbar with border and border-radius */}
        <div className="hidden md:flex items-center justify-center flex-shrink-0 pointer-events-auto">
          <motion.nav
            variants={navContainerVariants}
            initial="hidden"
            animate="visible"
            className="h-[48px] md:h-[52px] px-4 md:px-6 rounded-full flex items-center gap-2 lg:gap-3.5 transition-all duration-300 bg-transparent backdrop-blur-md border border-[#161412]/20 shadow-[0_4px_24px_rgba(22,20,18,0.08)]"
          >
            {navLinks.map((link) => (
              link.isHash ? (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-xs lg:text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 tracking-wide text-[#161412]/80 hover:text-[#161412] hover:bg-[#161412]/5"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-xs lg:text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 tracking-wide text-[#161412]/80 hover:text-[#161412] hover:bg-[#161412]/5"
                >
                  {link.name}
                </Link>
              )
            ))}
          </motion.nav>
        </div>

        {/* 3. RIGHT: Clean Language Selector Dropdown */}
        <div className="flex-1 flex items-center justify-end pointer-events-auto">
          {/* Desktop Language Dropdown */}
          <div className="hidden md:flex items-center gap-3">
            <div ref={langDropdownRef} className="relative">
              <motion.button
                type="button"
                variants={navItemVariants}
                onClick={() => setIsLangOpen((prev) => !prev)}
                aria-expanded={isLangOpen}
                aria-haspopup="listbox"
                aria-label={t('nav.selectLanguage', 'Select language')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer select-none bg-white/90 hover:bg-white border border-[#161412]/20 hover:border-[#161412]/35 text-[#161412] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                <svg
                  className="w-3.5 h-3.5 text-[#176B45] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>

                <span className={`text-[13px] font-bold`}>
                  {selectedLangObj.label}
                </span>

                <motion.svg
                  animate={{ rotate: isLangOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-3.5 h-3.5 text-[#161412] shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </motion.svg>
              </motion.button>

              {/* Clean Dropdown Popover */}
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    role="listbox"
                    aria-label={t('nav.languageOptions', 'Language options')}
                    className="absolute right-0 top-full mt-2 w-[160px] rounded-2xl p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] bg-white border border-[#161412]/15 text-[#161412] z-50 overflow-hidden"
                  >
                    {LANGUAGES.map((lang) => {
                      const isSelected = selectedLang === lang.code
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            changeLang(lang.code)
                            setIsLangOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors duration-150 cursor-pointer ${isSelected
                              ? 'bg-[#161412] text-white'
                              : 'text-[#161412] hover:bg-stone-100'
                            }`}
                        >
                          <span className={`${lang.script !== 'latin' ? 'text-[13px]' : 'text-[12.5px]'}`}>
                            {lang.label}
                          </span>

                          {isSelected && (
                            <svg
                              className="w-3.5 h-3.5 shrink-0 text-[#5dbb84]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop Auth State */}
            {isAuthenticated ? (<>
              <div ref={userMenuRef} className="relative">
                <motion.button
                  type="button"
                  variants={navItemVariants}
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-expanded={isUserMenuOpen}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-tight bg-white hover:bg-stone-50 border border-[#161412]/20 hover:border-[#161412]/35 text-[#161412] shadow-sm cursor-pointer select-none"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#176B45] to-[#2a9d6a] text-white flex items-center justify-center text-[10px] font-bold uppercase shadow-xs">
                    {user?.full_name ? user.full_name.charAt(0) : user?.email?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[100px] truncate text-[12.5px] font-bold">
                    {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-[210px] rounded-2xl p-2 shadow-[0_16px_36px_rgba(0,0,0,0.15)] bg-white border border-[#161412]/15 text-[#161412] z-50 overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-[#161412]/10 mb-1">
                        <p className="text-xs font-bold text-[#161412] truncate">{user?.full_name || 'Practitioner'}</p>
                        <p className="text-[11px] text-[#161412]/60 truncate">{user?.email}</p>
                        {user?.role && (
                          <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider bg-[#176B45]/10 text-[#176B45] px-2 py-0.5 rounded-full">
                            {user.role}
                          </span>
                        )}
                      </div>
                      <Link
                        to="/passports"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#161412] hover:bg-stone-100 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-[#176B45]" />
                        {t('nav.myPassports', 'My Passports')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout()
                          setIsUserMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {t('nav.signOut', 'Sign Out')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div></>
            ) : (
              <motion.div variants={navItemVariants}>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer select-none bg-[#176B45] hover:bg-[#125537] text-white shadow-[0_2px_10px_rgba(23,107,69,0.25)] hover:shadow-[0_4px_16px_rgba(23,107,69,0.35)] hover:scale-[1.03] active:scale-[0.97]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('nav.signIn', 'Sign In')}</span>
                </Link>
              </motion.div>
            )}
          </div>
          </div>

          {/* Mobile Quick Toggle & Hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#161412]/20 bg-white text-[#161412] shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              aria-label={t('nav.selectLanguage', 'Select language')}
            >
              <svg className="w-3.5 h-3.5 text-[#176B45]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              <span className="font-bold text-[12px]">
                {selectedLang.toUpperCase()}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 transition-colors duration-200 focus:outline-none text-[#161412] hover:text-[#161412]/80"
              aria-label={t('nav.toggleMenu', 'Toggle Menu')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      

      {/* Mobile Drawer Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto absolute top-20 left-4 right-4 bg-[#0a0a0a]/92 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-2 md:hidden"
          >
            {navLinks.map((link) => (
              link.isHash ? (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white/80 hover:text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white/80 hover:text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-white/5 transition-colors block"
                >
                  {link.name}
                </Link>
              )
            ))}

            {/* Mobile Language Switcher Inside Drawer */}
            <div className="pt-3 mt-1 border-t border-white/10">
              <span className="text-xs font-medium text-white/60 px-2 block mb-2">{t('nav.language', 'Language / भाषा')}</span>
              <div className="grid grid-cols-3 gap-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      changeLang(lang.code)
                      setMobileMenuOpen(false)
                    }}
                    className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all text-center ${selectedLang === lang.code
                        ? 'bg-[#176B45] text-white shadow-xs'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Auth Actions */}
            <div className="pt-3 mt-1 border-t border-white/10 flex flex-col gap-2">
              {isAuthenticated ? (
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user?.full_name || 'Practitioner'}</p>
                    <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('nav.signOut', 'Sign Out')}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-[#176B45] text-white text-center shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{t('nav.signIn', 'Sign In')}</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white text-center border border-white/10"
                  >
                    {t('nav.register', 'Register')}
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
