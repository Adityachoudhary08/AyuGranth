import { useState, useRef, useEffect } from 'react';
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
  Scale
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils/cn';
import { ragApi, documentsApi } from '../api';
import Navbar from '../components/Navbar';
import ChatSourceCard from '../components/chat/ChatSourceCard';
import ChatAbstentionCard from '../components/chat/ChatAbstentionCard';
import PatentReadinessCard from '../components/chat/PatentReadinessCard';

export default function AskAayuGranth() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // 1. Context detection (only when explicitly provided via state or query params)
  const contextProductId = location.state?.product_id || location.state?.passportId || queryParams.get('productId') || queryParams.get('passportId') || null;
  const contextProductName = location.state?.productName || queryParams.get('productName') || null;
  const hasProductContext = Boolean(contextProductId || contextProductName);

  // 2. Initial Greeting logic
  const getInitialGreeting = () => {
    if (hasProductContext) {
      const displayName = contextProductName || `Dossier #${contextProductId}`;
      return `Reviewing ${displayName} — ask me about its patentability, traditional knowledge citations, ABS compliance, or regulatory pathways.`;
    }
    return "Hi, I'm AayuGranth. Ask me about patents, traditional knowledge, ABS compliance, or regulatory pathways for your Ayurvedic product.";
  };

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('India');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});

  const LOADING_STEPS = [
    "Analyzing your question and intent...",
    "Searching the verified legal and classical knowledge base...",
    "Reviewing relevant statutory and classical sources...",
    "Synthesizing verified research intelligence..."
  ];

  // Cycling loading steps timer
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
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  const formatTimestamp = (date = new Date()) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, uploadingDoc, loadingStepIndex]);

  const resizeComposer = (element) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
  };

  // Helper labels for intent-aware headers
  const getIntentTitle = (intent) => {
    switch (intent) {
      case 'PATENTABILITY': return 'AAYUGRANTH · Patentability Assessment';
      case 'PRIOR_ART': return 'AAYUGRANTH · Prior-Art Analysis';
      case 'TK_ANALYSIS': return 'AAYUGRANTH · Traditional Knowledge Analysis';
      case 'ABS': return 'AAYUGRANTH · ABS Assessment';
      case 'REGULATORY': return 'AAYUGRANTH · Regulatory Assessment';
      case 'FORMULATION': return 'AAYUGRANTH · Formulation Research';
      case 'PRODUCT_PASSPORT': return 'AAYUGRANTH · Digital Product Passport';
      default: return 'AAYUGRANTH · Research Response';
    }
  };

  const getIntentSectionLabel = (intent) => {
    switch (intent) {
      case 'PATENTABILITY': return 'Patentability Assessment';
      case 'PRIOR_ART': return 'Prior-Art Analysis & Review';
      case 'TK_ANALYSIS': return 'Traditional Knowledge Analysis';
      case 'ABS': return 'ABS Legal Assessment';
      case 'REGULATORY': return 'Regulatory Intelligence';
      case 'FORMULATION': return 'Formulation & Ingredient Research';
      case 'PRODUCT_PASSPORT': return 'Product Passport Analysis';
      default: return 'AI Assessment';
    }
  };

  // ─────────────────────────────────────────────────────────────
  // STOP GENERATION (AbortController)
  // ─────────────────────────────────────────────────────────────
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
          {
            ...last,
            isLoadingPlaceholder: false,
            isStopped: true,
            content: "[Generation stopped by user]",
          }
        ];
      }
      return prev;
    });
  };

  // ─────────────────────────────────────────────────────────────
  // RESET / NEW CONVERSATION
  // ─────────────────────────────────────────────────────────────
  const handleNewConversation = () => {
    handleStopGeneration();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: getInitialGreeting(),
        timestamp: formatTimestamp(),
        isInitial: true,
        hasContext: hasProductContext,
        productName: contextProductName,
        productId: contextProductId,
      }
    ]);
  };

  // ─────────────────────────────────────────────────────────────
  // UPLOAD DOCUMENT (PATENT READINESS)
  // ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be selected again
    e.target.value = '';

    const userMsgId = `usr-doc-${Date.now()}`;
    const assistantMsgId = `ast-doc-${Date.now() + 1}`;
    const timestamp = formatTimestamp();

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: `Uploaded document for patent readiness analysis: ${file.name}`,
        timestamp,
        isDocumentUpload: true,
        fileName: file.name,
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        isLoadingPlaceholder: true,
        timestamp,
      }
    ]);

    setIsLoading(true);
    setUploadingDoc(true);
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (contextProductId) {
        formData.append('product_id', contextProductId);
      }

      const res = await documentsApi.uploadDocument(formData, {
        signal: abortControllerRef.current.signal,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoadingPlaceholder: false,
                content: `Document analysis completed for ${file.name}. Detected: ${res.document_type_detected || 'Patent Draft'} (Readiness Score: ${res.readiness_score || 'N/A'}).`,
                documentAnalysis: res,
                confidence_label: 'high',
              }
            : msg
        )
      );
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Document upload error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoadingPlaceholder: false,
                isError: true,
                content: "Unable to parse or verify the uploaded document. Please ensure it is a valid PDF or Word document.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setUploadingDoc(false);
      abortControllerRef.current = null;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUBMIT CHAT MESSAGE (POST /ask/)
  // ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e, retryQuery = null) => {
    if (e) e.preventDefault();
    const query = retryQuery || input;
    if (!query.trim() || isLoading) return;

    if (!retryQuery) {
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    const userMsgId = `usr-${Date.now()}`;
    const assistantMsgId = `ast-${Date.now() + 1}`;
    const timestamp = formatTimestamp();

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: query,
        jurisdiction,
        timestamp,
      },
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        isLoadingPlaceholder: true,
        timestamp,
      }
    ]);

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await ragApi.askQuestion(
        {
          query: query,
          jurisdiction: jurisdiction,
        },
        {
          signal: abortControllerRef.current.signal,
        }
      );

      // Extract verification details from backend response
      const answer = response?.answer || "No response received from RAG engine.";
      const assessment = response?.assessment || answer;
      const why = response?.why || response?.summary || "";
      const summary = response?.summary || "";
      const keyPoints = Array.isArray(response?.key_points) ? response.key_points : [];
      const claims = Array.isArray(response?.claims) ? response.claims : [];
      const sourcesUsed = Array.isArray(response?.sources_used) ? response.sources_used : [];
      const evidenceItems = Array.isArray(response?.evidence) ? response.evidence : [];
      const confidenceLabel = response?.confidence_label || "high";
      const confidenceScore = typeof response?.confidence === 'number' ? response.confidence : 0.85;
      const isAbstained = Boolean(response?.abstained);
      const disclaimer = response?.disclaimer || "This is a preliminary assessment for informational purposes only — not legal advice.";
      const intent = response?.intent || "GENERAL_RESEARCH";
      const responseStatus = response?.response_status || "success";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoadingPlaceholder: false,
                content: answer,
                assessment,
                why,
                summary: summary,
                key_points: keyPoints,
                claims: claims,
                sources_used: sourcesUsed,
                evidence: evidenceItems,
                confidence_label: confidenceLabel,
                confidence_score: confidenceScore,
                abstained: isAbstained,
                disclaimer: disclaimer,
                originalQuery: query,
                intent: intent,
                response_status: responseStatus,
              }
            : msg
        )
      );
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("RAG ask error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoadingPlaceholder: false,
                isError: true,
                failedQuery: query,
                content: "We couldn't complete the analysis because the knowledge service encountered an unexpected error. The retrieved evidence may be unavailable.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const toggleSources = (msgId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // THEME DEFINITIONS
  // ─────────────────────────────────────────────────────────────
  const containerBg = isDarkMode ? "bg-[#0C1410]" : "bg-[#FAF8F3]";
  const headerBg = isDarkMode ? "bg-[#14201A] border-[#22332A]" : "bg-white border-[#161412]/10";
  const chatAreaBg = isDarkMode ? "bg-[#0C1410]" : "bg-[#FAF8F3]";
  const textPrimary = isDarkMode ? "text-gray-100" : "text-[#161412]";
  const textSecondary = isDarkMode ? "text-gray-400" : "text-[#161412]/65";
  const inputContainerBg = isDarkMode ? "bg-[#14201A] border-[#22332A]" : "bg-white border-[#161412]/10";
  const inputBg = isDarkMode ? "bg-[#1A2922] border-[#2A3F34]" : "bg-[#F7F5EF] border-[#161412]/15";
  const botBubbleBg = isDarkMode ? "bg-[#14201A] border-[#22332A] text-gray-100" : "bg-white border-[#161412]/12 text-[#161412]";
  const userBubbleBg = "bg-[#176B45] text-white border-[#176B45]";

  return (
    <div className={cn("relative flex flex-col h-[100dvh] w-full overflow-hidden transition-colors duration-200 font-sans", containerBg)}>
      <Navbar />

      {/* CHAT MESSAGES SCROLL AREA */}
      <main className={cn("flex-1 overflow-y-auto px-4 pt-28 pb-48 sm:pt-32 sm:pb-52 md:px-8 flex flex-col items-center", chatAreaBg)}>
        <div className="w-full max-w-4xl space-y-6 pb-4">

          {/* Context Banner if navigated from a product */}
          {hasProductContext && (
            <div className={cn(
              "p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs",
              isDarkMode ? "bg-[#14201A] border-[#176B45]/40 text-emerald-300" : "bg-[#176B45]/10 border-[#176B45]/25 text-[#176B45]"
            )}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#176B45] animate-pulse" />
                <span className="font-mono font-bold uppercase tracking-wider">
                  ACTIVE DOSSIER CONTEXT: {contextProductName ? contextProductName.toUpperCase() : `PASSPORT #${contextProductId}`}
                </span>
              </div>
              {contextProductId && (
                <Link
                  to={`/product-passport/${contextProductId}`}
                  className="font-bold underline hover:opacity-80 flex items-center gap-1 shrink-0"
                >
                  <span>Open Passport</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const evidenceList = msg.evidence && msg.evidence.length > 0
              ? msg.evidence
              : (msg.sources_used || msg.claims || []);
            const hasSources = evidenceList.length > 0;
            const isExpanded = Boolean(expandedSources[msg.id]);
            const keyPoints = msg.key_points || [];

            return (
              <div key={msg.id || idx} className={cn("flex gap-3 sm:gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
                
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs text-xs font-bold",
                  isUser 
                    ? "bg-[#176B45] text-white border-[#176B45]" 
                    : isDarkMode 
                      ? "bg-[#176B45]/30 text-[#4ADE80] border-[#176B45]/50" 
                      : "bg-[#FAF8F3] text-[#176B45] border-[#161412]/15"
                )}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4.5 h-4.5" />}
                </div>

                {/* Message Body */}
                <div className={cn("flex flex-col gap-1 max-w-[95%] sm:max-w-[85%]", isUser ? "items-end" : "items-start")}>
                  
                  {/* Initial Greeting Card */}
                  {msg.isInitial ? (
                    <div className={cn("p-5 sm:p-6 rounded-2xl border shadow-xs space-y-3", botBubbleBg, "rounded-tl-none")}>
                      <div className="flex items-center justify-between gap-2 border-b border-inherit/30 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#176B45] dark:text-[#4ADE80]" />
                          <span className="font-mono text-[11px] uppercase font-bold tracking-wider text-[#176B45] dark:text-[#4ADE80]">
                            AAYUGRANTH · Institutional Legal Intelligence
                          </span>
                        </div>
                        <span className="font-mono text-[10.5px] opacity-60">Verified Assistant</span>
                      </div>

                      <p className="text-sm sm:text-[15px] leading-relaxed font-normal">
                        {msg.content}
                      </p>

                      <div className="pt-2.5 border-t border-inherit/30 flex items-center justify-between text-[11px] font-mono opacity-70">
                        <span>Information, not legal advice</span>
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>
                  ) : msg.isLoadingPlaceholder ? (
                    /* Meaningful Text Loading Progression State */
                    <div className={cn("p-5 rounded-2xl border shadow-xs space-y-3 min-w-[280px]", botBubbleBg, "rounded-tl-none")}>
                      <div className="flex items-center gap-2 border-b border-inherit/30 pb-2">
                        <div className="w-2 h-2 rounded-full bg-[#176B45] animate-pulse" />
                        <span className="font-mono text-[10.5px] uppercase font-bold tracking-wider text-[#176B45] dark:text-[#4ADE80]">
                          AayuGranth Research Engine
                        </span>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-[#176B45] animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-[#176B45] animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <div className="w-2 h-2 rounded-full bg-[#176B45] animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                        <span className="text-xs sm:text-[13px] font-medium text-[#161412]/80 dark:text-gray-200 transition-all duration-300">
                          {LOADING_STEPS[loadingStepIndex]}
                        </span>
                      </div>
                    </div>
                  ) : msg.documentAnalysis ? (
                    /* Patent Readiness Upload Result Card */
                    <div className="w-full">
                      <PatentReadinessCard analysis={msg.documentAnalysis} isDarkMode={isDarkMode} />
                    </div>
                  ) : msg.abstained ? (
                    /* Low Confidence / Abstention Card */
                    <div className="w-full">
                      <ChatAbstentionCard 
                        query={msg.originalQuery || msg.content}
                        productId={contextProductId}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  ) : isUser ? (
                    /* User Message Bubble */
                    <div className={cn("p-4 sm:p-5 rounded-2xl border shadow-xs space-y-2", userBubbleBg, "rounded-tr-none")}>
                      <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.content}
                      </p>
                      <div className="text-[10px] font-mono text-white/70 text-right">
                        {msg.timestamp}
                      </div>
                    </div>
                  ) : (
                    /* CONSISTENT INTENT-AWARE RESEARCH RESPONSE CARD */
                    <div className={cn(
                      "w-full p-5 sm:p-6 rounded-2xl border shadow-xs space-y-4",
                      msg.isError
                        ? "bg-red-50 border-red-200 text-red-900 rounded-tl-none dark:bg-red-950/30 dark:border-red-900 dark:text-red-200"
                        : cn(botBubbleBg, "rounded-tl-none")
                    )}>
                      {/* 1. Header: Dynamic intent-aware header */}
                      <div className="flex items-center justify-between gap-2 border-b border-inherit/30 pb-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] uppercase font-bold tracking-wider text-[#176B45] dark:text-[#4ADE80]">
                            {getIntentTitle(msg.intent)}
                          </span>
                        </div>

                        {/* Status / Confidence Badge */}
                        <div className="flex items-center gap-1.5 font-mono text-[10.5px] font-bold">
                          {msg.response_status === 'fallback' || msg.response_status === 'timeout' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              {msg.response_status === 'timeout' ? 'AI Synthesis Timed Out · Evidence Retained' : 'Preliminary Evidence-Based Assessment'}
                            </span>
                          ) : msg.confidence_label === 'high' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              High Evidence Confidence
                            </span>
                          ) : msg.confidence_label === 'moderate' || msg.confidence_label === 'medium' || msg.confidence_label === 'preliminary' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              Moderate Evidence
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              Low Evidence
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Notice bar if synthesis was fallback or timeout */}
                      {(msg.response_status === 'fallback' || msg.response_status === 'timeout') && (
                        <div className="p-3 rounded-xl border bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-200 text-xs sm:text-[13px] flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <span className="font-semibold">AI assessment could not be fully synthesized from available evidence.</span> The retrieved statutory and classical evidence is retained below for independent review.
                          </div>
                        </div>
                      )}

                      {/* Intent-Aware Assessment Box */}
                      <section className={cn(
                        "rounded-xl border p-4 sm:p-5 space-y-3",
                        isDarkMode ? "bg-[#15231b] border-[#315542]" : "bg-[#176B45]/[0.06] border-[#176B45]/25"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#176B45] dark:text-[#4ADE80]">
                            {getIntentSectionLabel(msg.intent)}
                          </div>
                          {msg.intent === 'PRIOR_ART' && (
                            <span className="text-[10.5px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                              Patent Comparative Review
                            </span>
                          )}
                        </div>

                        <p className="text-[15px] sm:text-base leading-relaxed font-medium">
                          {msg.assessment || msg.content}
                        </p>

                        {msg.why && (
                          <div className="pt-3 border-t border-inherit/40">
                            <div className="text-[11px] font-mono uppercase font-bold tracking-wider opacity-75 mb-1.5">
                              {msg.intent === 'PRIOR_ART' ? 'Why Relevant / Analysis' : 'Why?'}
                            </div>
                            <p className="text-sm sm:text-[15px] leading-relaxed opacity-90">{msg.why}</p>
                          </div>
                        )}
                      </section>

                      {/* Summary note if present */}
                      {msg.summary && !msg.why && (
                        <div className={cn(
                          "p-3 rounded-xl border text-xs sm:text-[13px] leading-relaxed font-medium",
                          isDarkMode ? "bg-[#1A2822] border-[#263C30] text-emerald-200" : "bg-[#176B45]/8 border-[#176B45]/20 text-[#176B45]"
                        )}>
                          {msg.summary}
                        </div>
                      )}

                      {/* Key findings */}
                      {keyPoints.length > 0 && (
                        <div className="pt-3 border-t border-inherit/30 space-y-2">
                          <span className="text-[11px] font-mono uppercase font-bold tracking-wider opacity-80 block">
                            Key Findings
                          </span>
                          <ul className="space-y-1.5 text-xs sm:text-[13px] leading-relaxed">
                            {keyPoints.map((point, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2">
                                <span className="text-[#176B45] dark:text-[#4ADE80] font-bold select-none">•</span>
                                <span className="opacity-90">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Retrieved excerpts / Supporting Evidence */}
                      {hasSources && (
                        <div className="pt-3 border-t border-inherit/30 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase font-bold tracking-wider opacity-80 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#176B45] dark:text-[#4ADE80]" />
                              <span>
                                {msg.intent === 'PRIOR_ART' 
                                  ? `Retrieved Documents for Review (${evidenceList.length})` 
                                  : msg.intent === 'TK_ANALYSIS'
                                  ? `Classical & TK References (${evidenceList.length})`
                                  : `Supporting Evidence (${evidenceList.length})`
                                }
                              </span>
                            </span>

                            <button
                              type="button"
                              onClick={() => toggleSources(msg.id)}
                              className="text-[11px] font-semibold text-[#176B45] dark:text-[#4ADE80] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {isExpanded ? "Collapse Evidence" : "View Evidence"}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* Expanded Source Cards */}
                          {isExpanded && (
                            <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                              {evidenceList.map((src, sIdx) => (
                                <ChatSourceCard
                                  key={sIdx}
                                  source={src}
                                  isDarkMode={isDarkMode}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Statutory Disclaimer */}
                      <div className="pt-3 border-t border-inherit/30 flex items-center justify-between text-[11px] font-mono opacity-60">
                        <span>{msg.disclaimer || "Preliminary informational assessment — not legal advice."}</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      {/* Error Retry Option */}
                      {msg.isError && msg.failedQuery && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleSubmit(null, msg.failedQuery)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Query</span>
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

      {/* INPUT AREA: Fixed, compact, non-intrusive floating composer */}
      <footer className="fixed bottom-0 sm:bottom-3 left-0 right-0 z-30 pointer-events-none flex flex-col items-center px-3 sm:px-4">
        <div className="w-full max-w-[880px] pointer-events-auto flex flex-col gap-1.5">
          <form 
            onSubmit={(e) => handleSubmit(e)} 
            className={cn(
              "flex items-end gap-1.5 sm:gap-2 rounded-2xl border p-1.5 sm:p-2 shadow-lg backdrop-blur-xl transition-all duration-200",
              isDarkMode 
                ? "bg-[#14201A]/95 border-[#2A3F34] shadow-black/40" 
                : "bg-white/95 border-[#161412]/15 shadow-black/10"
            )}
          >
            {/* File Upload Button */}
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
              className={cn(
                "p-2 rounded-xl border transition-colors shrink-0 cursor-pointer disabled:opacity-50",
                isDarkMode 
                  ? "bg-[#1A2922] border-[#2A3F34] text-gray-300 hover:bg-[#253A2F]" 
                  : "bg-[#F7F5EF] border-[#161412]/15 text-[#161412]/70 hover:bg-[#EBE7DC]"
              )}
              title="Upload Patent Draft or Formulation Doc"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Jurisdiction Selector */}
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className={cn(
                "py-2 px-2 rounded-xl border text-xs font-mono font-medium shrink-0 cursor-pointer outline-none",
                isDarkMode 
                  ? "bg-[#1A2922] border-[#2A3F34] text-gray-200" 
                  : "bg-[#F7F5EF] border-[#161412]/15 text-[#161412]"
              )}
            >
              <option value="India">🇮🇳 India</option>
              <option value="International">🌐 International</option>
            </select>

            {/* Query Input */}
            <div className="relative flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => { setInput(e.target.value); resizeComposer(e.target); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                placeholder={hasProductContext ? `Ask about ${contextProductName || 'this dossier'}...` : "Ask AayuGranth anything about your research"}
                disabled={isLoading}
                style={{ maxHeight: '140px' }}
                className={cn(
                  "w-full resize-none overflow-y-auto py-1.5 sm:py-2 pl-3 pr-2 text-[14px] sm:text-[15px] leading-5 outline-none transition-colors bg-transparent min-h-[38px]",
                  textPrimary, "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                )}
              />
            </div>

            {/* Send or Stop Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0 cursor-pointer shadow-xs"
                title="Stop generation"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-xl bg-[#176B45] hover:bg-[#125837] disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer shadow-xs"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            )}

            {/* Reset / New Chat */}
            <button
              type="button"
              onClick={handleNewConversation}
              className={cn(
                "p-2 rounded-xl border transition-colors shrink-0 cursor-pointer",
                isDarkMode 
                  ? "bg-[#1A2922] border-[#2A3F34] text-gray-400 hover:text-white" 
                  : "bg-[#F7F5EF] border-[#161412]/15 text-[#161412]/60 hover:text-[#161412]"
              )}
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </form>

          {/* Footer note */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono opacity-50 px-2">
            <span>AayuGranth Intelligence · BGE-M3 + MongoDB Atlas</span>
            <span>Preliminary research guidance · Not legal advice</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
