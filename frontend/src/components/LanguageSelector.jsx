import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', script: 'latin' },
  { code: 'hi', label: 'हिंदी', script: 'devanagari' },
  { code: 'ta', label: 'தமிழ்', script: 'tamil' },
  { code: 'te', label: 'తెలుగు', script: 'telugu' },
  { code: 'mr', label: 'मराठी', script: 'devanagari' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedLang = LANGUAGES.find((l) => l.code === (i18n.language || 'en')) || LANGUAGES[0];

  useEffect(() => {
    const saved = localStorage.getItem('aayugranth_lang') || 'en';
    if (i18n.language !== saved) {
      i18n.changeLanguage(saved);
    }
    document.documentElement.lang = saved;
  }, [i18n]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLang = (code) => {
    localStorage.setItem('aayugranth_lang', code);
    i18n.changeLanguage(code);
    document.documentElement.lang = code;
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-[#161412]/20 hover:border-[#161412]/35 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all cursor-pointer select-none text-[#161412]"
      >
        <Globe className="w-3.5 h-3.5 text-[#176B45]" />
        <span className="text-[13px] font-bold">{selectedLang.label}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-32 rounded-2xl p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] bg-white border border-[#161412]/15 overflow-hidden"
          >
            {LANGUAGES.map((lang) => {
              const isSelected = (i18n.language || 'en') === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => changeLang(lang.code)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#161412] text-white' : 'text-[#161412] hover:bg-stone-100'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
