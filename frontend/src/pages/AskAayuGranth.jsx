import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Paperclip,
  Moon,
  Sun,
  ArrowRight,
  RotateCcw,
  Square,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Search,
  BookOpen,
  Scale,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Languages,
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils/cn';
import { ragApi, documentsApi, multilingualApi } from '../api';
import Navbar from '../components/Navbar';
import ChatSourceCard from '../components/chat/ChatSourceCard';
import ChatAbstentionCard from '../components/chat/ChatAbstentionCard';
import PatentReadinessCard from '../components/chat/PatentReadinessCard';
import i18n from '../i18n/index.js';

// ── Language config ───────────────────────────────────────────────────────────
const CHAT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
];

// Max recording duration (ms)
const MAX_RECORDING_MS = 30000;

export default function AskAayuGranth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // 1. Context detection
  const contextProductId = location.state?.product_id || location.state?.passportId || queryParams.get('productId') || queryParams.get('passportId') || null;
  const contextProductName = location.state?.productName || queryParams.get('productName') || null;
  const hasProductContext = Boolean(contextProductId || contextProductName);

  // 2. Language: follow global navbar lang, with chatbot-local fallback
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('aayugranth_lang') || 'en';
  });

  // Keep language in sync when user changes it in the Navbar
  useEffect(() => {
    const syncLang = () => {
      const saved = localStorage.getItem('aayugranth_lang') || 'en';
      setLanguage(saved);
    };
    // Poll localStorage changes (cross-tab sync is not available without BroadcastChannel)
    const id = setInterval(syncLang, 500);
    return () => clearInterval(id);
  }, []);

  // Also sync whenever i18n language changes
  useEffect(() => {
    const handler = (lng) => setLanguage(lng);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);

  // 2. Initial Greeting
  const getInitialGreeting = useCallback(() => {
    if (hasProductContext) {
      const displayName = contextProductName || `Dossier #${contextProductId}`;
      return t('chat.greetingWithContext', { productName: displayName });
    }
    return t('chat.greeting');
  }, [hasProductContext, contextProductName, contextProductId, t]);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('India');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});

  // Voice: recording
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [volume, setVolume] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Voice: TTS playback per message
  const [ttsLoadingId, setTtsLoadingId] = useState(null);
  const [ttsPlayingId, setTtsPlayingId] = useState(null);
  const currentAudioRef = useRef(null);

  const LOADING_STEPS = [
    t('chat.loading.step1'),
    t('chat.loading.step2'),
    t('chat.loading.step3'),
    t('chat.loading.step4'),
  ];

  // Loading steps cycle
  useEffect(() => {
    let interval = null;
    if (isLoading) {
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2500);
    } else {
      setLoadingStepIndex(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isLoading]);

  const formatTimestamp = (date = new Date()) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const [messages, setMessages] = useState(() => [
    {
      id: 'msg-init',
      role: 'assistant',
      content: getInitialGreeting(),
      timestamp: formatTimestamp(),
      isInitial: true,
      hasContext: hasProductContext,
      productName: contextProductName,
      productId: contextProductId,
    }
  ]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isLoading, uploadingDoc, loadingStepIndex]);

  const resizeComposer = (element) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
  };

  // Intent-aware helpers
  const getIntentTitle = (intent) => {
    const key = `chat.intent.${intent}`;
    return t(key, t('chat.intent.default'));
  };

  const getIntentSectionLabel = (intent) => {
    const key = `chat.intentSection.${intent}`;
    return t(key, t('chat.intentSection.default'));
  };

  // ── STOP GENERATION ───────────────────────────────────────────────────────
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setUploadingDoc(false);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant' && last.isLoadingPlaceholder) {
        return [
          ...prev.slice(0, -1),
          { ...last, isLoadingPlaceholder: false, isStopped: true, content: t('chat.stoppedByUser') },
        ];
      }
      return prev;
    });
  };

  // ── RESET ─────────────────────────────────────────────────────────────────
  const handleNewConversation = () => {
    handleStopGeneration();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages([{
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: getInitialGreeting(),
      timestamp: formatTimestamp(),
      isInitial: true,
      hasContext: hasProductContext,
      productName: contextProductName,
      productId: contextProductId,
    }]);
  };

  // ── FILE UPLOAD ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const userMsgId = `usr-doc-${Date.now()}`;
    const assistantMsgId = `ast-doc-${Date.now() + 1}`;
    const timestamp = formatTimestamp();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: t('chat.documentUploaded', { fileName: file.name }), timestamp, isDocumentUpload: true, fileName: file.name },
      { id: assistantMsgId, role: 'assistant', content: '', isLoadingPlaceholder: true, timestamp },
    ]);

    setIsLoading(true);
    setUploadingDoc(true);
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (contextProductId) formData.append('product_id', contextProductId);

      const res = await documentsApi.uploadDocument(formData, { signal: abortControllerRef.current.signal });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoadingPlaceholder: false,
                content: t('chat.documentAnalyzed', {
                  fileName: file.name,
                  type: res.document_type_detected || 'Patent Draft',
                  score: res.readiness_score || 'N/A',
                }),
                documentAnalysis: res,
                confidence_label: 'high',
              }
            : msg
        )
      );
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, isLoadingPlaceholder: false, isError: true, content: t('chat.documentError') }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setUploadingDoc(false);
      abortControllerRef.current = null;
    }
  };

  // ── SUBMIT CHAT MESSAGE ───────────────────────────────────────────────────
  const handleSubmit = async (e, retryQuery = null) => {
    if (e) e.preventDefault();
    const query = retryQuery || input;
    if (!query.trim() || isLoading) return;

    if (!retryQuery) {
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }

    const userMsgId = `usr-${Date.now()}`;
    const assistantMsgId = `ast-${Date.now() + 1}`;
    const timestamp = formatTimestamp();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: query, jurisdiction, timestamp, language },
      { id: assistantMsgId, role: 'assistant', content: '', isLoadingPlaceholder: true, timestamp },
    ]);

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await ragApi.askQuestion(
        { query, jurisdiction, language },
        { signal: abortControllerRef.current.signal }
      );

      const answer = response?.answer || 'No response received from RAG engine.';
      const assessment = response?.assessment || answer;
      const why = response?.why || response?.summary || '';
      const summary = response?.summary || '';
      const keyPoints = Array.isArray(response?.key_points) ? response.key_points : [];
      const claims = Array.isArray(response?.claims) ? response.claims : [];
      const sourcesUsed = Array.isArray(response?.sources_used) ? response.sources_used : [];
      const evidenceItems = Array.isArray(response?.evidence) ? response.evidence : [];
      const confidenceLabel = response?.confidence_label || 'high';
      const confidenceScore = typeof response?.confidence === 'number' ? response.confidence : 0.85;
      const isAbstained = Boolean(response?.abstained);
      const disclaimer = response?.disclaimer || t('chat.disclaimer');
      const intent = response?.intent || 'GENERAL_RESEARCH';
      const responseStatus = response?.response_status || 'success';
      const translationAvailable = response?.translation_available !== false;
      const translationNotice = response?.translation_notice || null;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoadingPlaceholder: false,
                content: answer,
                assessment,
                why,
                summary,
                key_points: keyPoints,
                claims,
                sources_used: sourcesUsed,
                evidence: evidenceItems,
                confidence_label: confidenceLabel,
                confidence_score: confidenceScore,
                abstained: isAbstained,
                disclaimer,
                originalQuery: query,
                intent,
                response_status: responseStatus,
                language,
                translation_available: translationAvailable,
                translation_notice: translationNotice,
              }
            : msg
        )
      );
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoadingPlaceholder: false,
                isError: true,
                failedQuery: query,
                content: t('chat.ragError'),
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // ── VOICE INPUT ───────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setVolume(0);
  }, []);

  const handleMicClick = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (isLoading || isTranscribing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio API for silence detection
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      let lastSoundTime = Date.now();
      const SILENCE_THRESHOLD = 10; // Volume threshold (0-255)
      const SILENCE_DURATION = 1500; // 1.5s of silence

      const checkSilence = () => {
        if (mediaRecorderRef.current?.state !== 'recording') return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avgVolume = sum / bufferLength;
        setVolume(avgVolume);

        if (avgVolume > SILENCE_THRESHOLD) {
          lastSoundTime = Date.now(); // Reset silence timer
        }

        if (Date.now() - lastSoundTime > SILENCE_DURATION) {
          console.log("Silence detected, auto-stopping recording");
          stopRecording();
        } else {
          animationFrameRef.current = requestAnimationFrame(checkSilence);
        }
      };

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setVolume(0);

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];
          setIsTranscribing(true);
          try {
            const result = await multilingualApi.asr({ audio_base64: base64Audio, language });
            const transcript = result?.transcript || '';
            if (transcript.trim()) {
              setInput(transcript);
              if (textareaRef.current) {
                textareaRef.current.focus();
                resizeComposer(textareaRef.current);
              }
            }
          } catch (err) {
            console.error('ASR error:', err);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      
      // Start monitoring audio
      checkSilence();

      // Auto-stop after MAX_RECORDING_MS
      recordingTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setIsRecording(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, [stopRecording]);

  // ── VOICE OUTPUT (TTS) ────────────────────────────────────────────────────
  const handleTTS = async (msgId, text, msgLang) => {
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      if (ttsPlayingId === msgId) {
        setTtsPlayingId(null);
        return; // toggle off
      }
    }
    setTtsPlayingId(null);
    setTtsLoadingId(msgId);

    try {
      const targetLang = msgLang || language;
      const result = await multilingualApi.tts({ text, language: targetLang });
      const audioData = result?.audio_base64;
      if (!audioData) throw new Error('No audio returned');

      const audio = new Audio(`data:audio/wav;base64,${audioData}`);
      currentAudioRef.current = audio;

      audio.onplay = () => { setTtsLoadingId(null); setTtsPlayingId(msgId); };
      audio.onended = () => { setTtsPlayingId(null); currentAudioRef.current = null; };
      audio.onerror = () => { setTtsPlayingId(null); setTtsLoadingId(null); currentAudioRef.current = null; };

      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setTtsLoadingId(null);
      setTtsPlayingId(null);
    }
  };

  const toggleSources = (msgId) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // ── THEME ─────────────────────────────────────────────────────────────────
  const containerBg = isDarkMode ? 'bg-[#0C1410]' : 'bg-[#FAF8F3]';
  const chatAreaBg = isDarkMode ? 'bg-[#0C1410]' : 'bg-[#FAF8F3]';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-[#161412]';
  const botBubbleBg = isDarkMode
    ? 'bg-[#14201A] border-[#22332A] text-gray-100'
    : 'bg-white border-[#161412]/12 text-[#161412]';
  const userBubbleBg = 'bg-[#176B45] text-white border-[#176B45]';
  const inputAreaBg = isDarkMode
    ? 'bg-[#14201A]/95 border-[#2A3F34] shadow-black/40'
    : 'bg-white/95 border-[#161412]/15 shadow-black/10';
  const btnSecondary = isDarkMode
    ? 'bg-[#1A2922] border-[#2A3F34] text-gray-300 hover:bg-[#253A2F]'
    : 'bg-[#F7F5EF] border-[#161412]/15 text-[#161412]/70 hover:bg-[#EBE7DC]';

  return (
    <div className={cn('relative flex flex-col h-[100dvh] w-full overflow-hidden transition-colors duration-200 font-sans', containerBg)}>
      <Navbar />

      {/* CHAT MESSAGES SCROLL AREA */}
      <main className={cn('flex-1 overflow-y-auto px-4 pt-28 pb-52 sm:pt-32 sm:pb-56 md:px-8 flex flex-col items-center', chatAreaBg)}>
        <div className="w-full max-w-4xl space-y-6 pb-4">

          {/* Context Banner */}
          {hasProductContext && (
            <div className={cn(
              'p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs',
              isDarkMode ? 'bg-[#14201A] border-[#176B45]/40 text-emerald-300' : 'bg-[#176B45]/10 border-[#176B45]/25 text-[#176B45]'
            )}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#176B45] animate-pulse" />
                <span className="font-mono font-bold uppercase tracking-wider">
                  {t('chat.activeDossier')} {contextProductName ? contextProductName.toUpperCase() : `PASSPORT #${contextProductId}`}
                </span>
              </div>
              {contextProductId && (
                <Link
                  to={`/product-passport/${contextProductId}`}
                  className="font-bold underline hover:opacity-80 flex items-center gap-1 shrink-0"
                >
                  <span>{t('chat.openPassport')}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const evidenceList = msg.evidence?.length > 0
              ? msg.evidence
              : (msg.sources_used || msg.claims || []);
            const hasSources = evidenceList.length > 0;
            const isExpanded = Boolean(expandedSources[msg.id]);
            const keyPoints = msg.key_points || [];

            return (
              <div key={msg.id || idx} className={cn('flex gap-3 sm:gap-4', isUser ? 'flex-row-reverse' : 'flex-row')}>

                {/* Avatar */}
                <div className={cn(
                  'w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs text-xs font-bold',
                  isUser
                    ? 'bg-[#176B45] text-white border-[#176B45]'
                    : isDarkMode
                      ? 'bg-[#176B45]/30 text-[#4ADE80] border-[#176B45]/50'
                      : 'bg-[#FAF8F3] text-[#176B45] border-[#161412]/15'
                )}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4.5 h-4.5" />}
                </div>

                {/* Message Body */}
                <div className={cn('flex flex-col gap-1 max-w-[95%] sm:max-w-[85%]', isUser ? 'items-end' : 'items-start')}>

                  {/* Initial Greeting Card */}
                  {msg.isInitial ? (
                    <div className={cn('p-5 sm:p-6 rounded-2xl border shadow-xs space-y-3', botBubbleBg, 'rounded-tl-none')}>
                      <div className="flex items-center justify-between gap-2 border-b border-inherit/30 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#176B45]" />
                          <span className="font-mono text-[11px] uppercase font-bold tracking-wider text-[#176B45]">
                            {t('chat.title')}
                          </span>
                        </div>
                        <span className="font-mono text-[10.5px] opacity-60">{t('chat.verifiedAssistant')}</span>
                      </div>
                      <p className="text-sm sm:text-[15px] leading-relaxed">{msg.content}</p>
                      <div className="pt-2.5 border-t border-inherit/30 flex items-center justify-between text-[11px] font-mono opacity-70">
                        <span>{t('chat.disclaimer')}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                  ) : msg.isLoadingPlaceholder ? (
                    /* Loading State */
                    <div className={cn('p-5 rounded-2xl border shadow-xs space-y-3 min-w-[280px]', botBubbleBg, 'rounded-tl-none')}>
                      <div className="flex items-center gap-2 border-b border-inherit/30 pb-2">
                        <div className="w-2 h-2 rounded-full bg-[#176B45] animate-pulse" />
                        <span className="font-mono text-[10.5px] uppercase font-bold tracking-wider text-[#176B45]">
                          {t('chat.researchEngine')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-[#176B45] animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-[#176B45] animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <div className="w-2 h-2 rounded-full bg-[#176B45] animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                        <span className="text-xs sm:text-[13px] font-medium opacity-80 transition-all duration-300">
                          {language !== 'en'
                            ? (loadingStepIndex === LOADING_STEPS.length - 1 ? t('chat.translating') : LOADING_STEPS[loadingStepIndex])
                            : LOADING_STEPS[loadingStepIndex]}
                        </span>
                      </div>
                    </div>

                  ) : msg.documentAnalysis ? (
                    <div className="w-full">
                      <PatentReadinessCard analysis={msg.documentAnalysis} isDarkMode={isDarkMode} />
                    </div>

                  ) : msg.abstained ? (
                    <div className="w-full">
                      <ChatAbstentionCard query={msg.originalQuery || msg.content} productId={contextProductId} isDarkMode={isDarkMode} />
                    </div>

                  ) : isUser ? (
                    /* User Bubble */
                    <div className={cn('p-4 sm:p-5 rounded-2xl border shadow-xs space-y-2', userBubbleBg, 'rounded-tr-none')}>
                      <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                      <div className="text-[10px] font-mono text-white/70 text-right">{msg.timestamp}</div>
                    </div>

                  ) : (
                    /* Assistant Research Response Card */
                    <div className={cn(
                      'w-full p-5 sm:p-6 rounded-2xl border shadow-xs space-y-4',
                      msg.isError
                        ? 'bg-red-50 border-red-200 text-red-900 rounded-tl-none dark:bg-red-950/30'
                        : cn(botBubbleBg, 'rounded-tl-none')
                    )}>
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-inherit/30 pb-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] uppercase font-bold tracking-wider text-[#176B45]">
                            {getIntentTitle(msg.intent)}
                          </span>
                          {/* Language badge for non-English responses */}
                          {msg.language && msg.language !== 'en' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#176B45]/10 border border-[#176B45]/20 text-[#176B45] text-[10px] font-bold">
                              <Languages className="w-2.5 h-2.5" />
                              {CHAT_LANGUAGES.find(l => l.code === msg.language)?.label || msg.language.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Confidence badge */}
                        <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold">
                          {msg.response_status === 'fallback' || msg.response_status === 'timeout' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              {msg.response_status === 'timeout' ? t('chat.timedOut') : t('chat.preliminary')}
                            </span>
                          ) : msg.confidence_label === 'high' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              {t('chat.highConfidence')}
                            </span>
                          ) : msg.confidence_label === 'moderate' || msg.confidence_label === 'medium' || msg.confidence_label === 'preliminary' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              {t('chat.moderateConfidence')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              {t('chat.lowConfidence')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Translation notice */}
                      {msg.translation_notice && (
                        <div className="p-2.5 rounded-xl border bg-amber-50/80 border-amber-200 text-amber-800 text-[11px] font-mono flex items-center gap-2">
                          <Languages className="w-3.5 h-3.5 shrink-0" />
                          {msg.translation_notice}
                        </div>
                      )}

                      {/* Timeout/fallback notice */}
                      {(msg.response_status === 'fallback' || msg.response_status === 'timeout') && (
                        <div className="p-3 rounded-xl border bg-amber-50/80 border-amber-200 text-amber-900 text-xs sm:text-[13px] flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="font-semibold">{t('chat.aiNotSynthesized')}</span> {t('chat.evidenceRetained')}
                          </div>
                        </div>
                      )}

                      {/* Assessment box */}
                      <section className={cn(
                        'rounded-xl border p-4 sm:p-5 space-y-3',
                        isDarkMode ? 'bg-[#15231b] border-[#315542]' : 'bg-[#176B45]/[0.06] border-[#176B45]/25'
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#176B45]">
                            {getIntentSectionLabel(msg.intent)}
                          </div>
                          {msg.intent === 'PRIOR_ART' && (
                            <span className="text-[10.5px] font-mono text-blue-600 font-semibold">
                              {t('chat.patentComparativeReview')}
                            </span>
                          )}
                        </div>
                        <p className="text-[15px] sm:text-base leading-relaxed font-medium">
                          {msg.assessment || msg.content}
                        </p>
                        {msg.why && (
                          <div className="pt-3 border-t border-inherit/40">
                            <div className="text-[11px] font-mono uppercase font-bold tracking-wider opacity-75 mb-1.5">
                              {msg.intent === 'PRIOR_ART' ? t('chat.whyRelevant') : t('chat.why')}
                            </div>
                            <p className="text-sm sm:text-[15px] leading-relaxed opacity-90">{msg.why}</p>
                          </div>
                        )}
                      </section>

                      {/* Summary */}
                      {msg.summary && !msg.why && (
                        <div className={cn(
                          'p-3 rounded-xl border text-xs sm:text-[13px] leading-relaxed font-medium',
                          isDarkMode ? 'bg-[#1A2822] border-[#263C30] text-emerald-200' : 'bg-[#176B45]/8 border-[#176B45]/20 text-[#176B45]'
                        )}>
                          {msg.summary}
                        </div>
                      )}

                      {/* Key findings */}
                      {keyPoints.length > 0 && (
                        <div className="pt-3 border-t border-inherit/30 space-y-2">
                          <span className="text-[11px] font-mono uppercase font-bold tracking-wider opacity-80 block">
                            {t('chat.keyFindings')}
                          </span>
                          <ul className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed">
                            {keyPoints.map((point, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2">
                                <span className="text-[#176B45] font-bold select-none">•</span>
                                <span className="opacity-90">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sources */}
                      {hasSources && (
                        <div className="pt-3 border-t border-inherit/30 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase font-bold tracking-wider opacity-80 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#176B45]" />
                              <span>
                                {msg.intent === 'PRIOR_ART'
                                  ? t('chat.retrievedDocs', { count: evidenceList.length })
                                  : msg.intent === 'TK_ANALYSIS'
                                  ? t('chat.classicalRefs', { count: evidenceList.length })
                                  : t('chat.supportingEvidence', { count: evidenceList.length })}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSources(msg.id)}
                              className="text-[11px] font-semibold text-[#176B45] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {isExpanded ? t('chat.collapseEvidence') : t('chat.viewEvidence')}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                              {evidenceList.map((src, sIdx) => (
                                <ChatSourceCard key={sIdx} source={src} isDarkMode={isDarkMode} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer: disclaimer + timestamp + TTS button */}
                      <div className="pt-3 border-t border-inherit/30 flex items-center justify-between text-[11px] font-mono opacity-60">
                        <span>{msg.disclaimer || t('chat.preliminaryDisclaimer')}</span>
                        <div className="flex items-center gap-2">
                          <span>{msg.timestamp}</span>
                          {/* TTS Speaker Button */}
                          {!msg.isError && msg.content && (
                            <button
                              type="button"
                              onClick={() => handleTTS(msg.id, msg.assessment || msg.content, msg.language)}
                              className="p-1 rounded-lg hover:bg-[#176B45]/10 transition-colors text-[#176B45] opacity-100 cursor-pointer"
                              title={t('chat.playResponse')}
                              aria-label={t('chat.playResponse')}
                            >
                              {ttsLoadingId === msg.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : ttsPlayingId === msg.id ? (
                                <VolumeX className="w-3.5 h-3.5" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Error retry */}
                      {msg.isError && msg.failedQuery && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleSubmit(null, msg.failedQuery)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{t('chat.retryQuery')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* INPUT AREA */}
      <footer className="fixed bottom-0 sm:bottom-3 left-0 right-0 z-30 pointer-events-none flex flex-col items-center px-3 sm:px-4">
        <div className="w-full max-w-[880px] pointer-events-auto flex flex-col gap-1.5">

          {/* Transcribing indicator */}
          {isTranscribing && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#176B45] animate-pulse px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{t('chat.transcribing')}</span>
            </div>
          )}

          <form
            onSubmit={(e) => handleSubmit(e)}
            className={cn(
              'flex items-end gap-1.5 sm:gap-2 rounded-2xl border p-1.5 sm:p-2 shadow-lg backdrop-blur-xl transition-all duration-200',
              inputAreaBg
            )}
          >
            {/* File Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.docx,.doc,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadingDoc}
              className={cn('p-2 rounded-xl border transition-colors shrink-0 cursor-pointer disabled:opacity-50', btnSecondary)}
              title={t('chat.uploadDoc')}
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isLoading || uploadingDoc || isTranscribing}
              className={cn(
                'p-2 rounded-xl border transition-all shrink-0 cursor-pointer disabled:opacity-50',
                isRecording
                  ? 'bg-red-500 border-red-600 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                  : btnSecondary
              )}
              title={isRecording ? t('chat.recording') : t('chat.startRecording')}
              aria-label={isRecording ? t('chat.recording') : t('chat.voiceInput')}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Jurisdiction Selector */}
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className={cn(
                'py-2 px-2 rounded-xl border text-xs font-mono font-medium shrink-0 cursor-pointer outline-none',
                isDarkMode ? 'bg-[#1A2922] border-[#2A3F34] text-gray-200' : 'bg-[#F7F5EF] border-[#161412]/15 text-[#161412]'
              )}
            >
              <option value="India">🇮🇳 {t('chat.jurisdiction.india')}</option>
              <option value="International">🌐 {t('chat.jurisdiction.international')}</option>
            </select>

            {/* Query Input */}
            <div className="relative flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => { setInput(e.target.value); resizeComposer(e.target); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                placeholder={
                  isRecording
                    ? t('chat.recording')
                    : isTranscribing
                    ? t('chat.transcribing')
                    : hasProductContext
                    ? t('chat.placeholderWithContext', { productName: contextProductName || 'this dossier' })
                    : t('chat.placeholder')
                }
                disabled={isLoading || isRecording}
                style={{ maxHeight: '140px' }}
                className={cn(
                  'w-full resize-none overflow-y-auto py-1.5 sm:py-2 pl-3 pr-2 text-[14px] sm:text-[15px] leading-5 outline-none transition-colors bg-transparent min-h-[38px]',
                  textPrimary, 'placeholder:text-gray-400'
                )}
              />
            </div>

            {/* Send or Stop */}
            {isLoading ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0 cursor-pointer shadow-xs"
                title={t('chat.stop')}
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || isTranscribing}
                className="p-2 rounded-xl bg-[#176B45] hover:bg-[#125837] disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer shadow-xs"
                title={t('chat.send')}
              >
                <Send className="w-4 h-4" />
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn('p-2 rounded-xl border transition-colors shrink-0 cursor-pointer', btnSecondary)}
              title={isDarkMode ? 'Light mode' : 'Dark mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleNewConversation}
              className={cn('p-2 rounded-xl border transition-colors shrink-0 cursor-pointer', btnSecondary)}
              title={t('chat.reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </form>

          {/* Recording progress bar / Visualizer */}
          {isRecording && (
            <div className="px-2">
              <div className="h-1 bg-[#176B45]/10 rounded-full overflow-hidden flex items-center">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-75 ease-out"
                  style={{ width: `${Math.min(100, (volume / 255) * 100 * 3 + 5)}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono opacity-50 px-2">
            <span>{t('chat.footerNote')}</span>
            <span>{t('chat.footerLegal')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
