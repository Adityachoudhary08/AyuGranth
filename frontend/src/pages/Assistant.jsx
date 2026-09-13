import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle2, AlertTriangle, ExternalLink, Moon, Sun, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ragApi } from '../api';
import { cn } from '../lib/utils/cn';
export default function Assistant() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hello! I am the AyuGranth Assistant. I can help you navigate classical texts, regulatory frameworks, and patent intelligence. How can I assist you today?'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState(null);
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  const handleSubmit = async e => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const query = input;
    setInput('');
    setMessages(prev => [...prev, {
      role: 'user',
      content: query
    }]);
    setIsLoading(true);
    try {
      const response = await ragApi.askQuestion({
        query,
        jurisdiction: 'India',
        include_citations: true
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
        verified_claims: response.verified_claims,
        confidence: response.confidence,
        abstained: response.abstained,
        escalated: response.escalated
      }]);
      setActiveEvidence(response);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error connecting to the knowledge base. Please try again.',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleUploadDocument = () => {
    navigate('/documents');
  };

  // Theme classes
  const containerBg = isDarkMode ? "bg-[#111]" : "bg-[#f8f7f4]";
  const panelBg = isDarkMode ? "bg-[#1a1a1a] border-[#333]" : "bg-white border-[#161412]/10";
  const textPrimary = isDarkMode ? "text-gray-100" : "text-[#161412]";
  const textSecondary = isDarkMode ? "text-gray-400" : "text-[#161412]/60";
  const headerBg = isDarkMode ? "bg-[#222]" : "bg-[#f8f7f4]";
  const inputBg = isDarkMode ? "bg-[#222] border-[#444]" : "bg-[#f8f7f4] border-[#161412]/10";
  const botBubbleBg = isDarkMode ? "bg-[#222] border-[#333]" : "bg-[#f8f7f4] border-[#161412]/10";
  return <div className={cn("flex h-full gap-6 p-2 rounded-2xl transition-colors duration-300", containerBg)}>
      {/* Conversation Pane */}
      <div className={cn("flex flex-col rounded-xl shadow-sm overflow-hidden transition-all duration-300 border", panelBg, activeEvidence ? "w-2/3" : "w-full")}>
        <div className={cn("px-6 py-4 border-b flex justify-between items-center", headerBg, isDarkMode ? "border-[#333]" : "border-[#161412]/10")}>
          <h2 className="font-serif text-lg text-[#176B45] flex items-center gap-2">
            <Bot className="w-5 h-5" />{t("assistant.aIAssistant", "AI Assistant")}</h2>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={cn("p-2 rounded-full transition-colors", isDarkMode ? "hover:bg-[#333] text-gray-300" : "hover:bg-white text-gray-600")}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300">
          {messages.map((msg, idx) => <div key={idx} className={cn("flex gap-4 max-w-4xl", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", msg.role === 'user' ? "bg-[#176B45] text-white" : cn(botBubbleBg, "text-[#176B45] border"))}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className="flex flex-col gap-1 min-w-[200px] w-full">
                {/* Abstention UX if confidence is low */}
                {msg.role === 'assistant' && (msg.abstained || msg.confidence !== undefined && msg.confidence < 0.6) ? <div className="p-5 rounded-xl bg-red-50 border border-red-200 text-red-900 w-full">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold mb-1">{t("assistant.lowConfidenceActionRequired", "Low Confidence: Action Required")}</p>
                        <p className="text-sm opacity-90 mb-4">{t("assistant.icouldntverifythis", "I couldn't verify this from the authoritative sources available to me. This may require review by a human IP facilitator.")}</p>
                        <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors">{t("assistant.escalatetoExpert", "Escalate to Expert")}</button>
                      </div>
                    </div>
                  </div> : <div className={cn("p-4 rounded-xl border", msg.role === 'user' ? "bg-[#176B45] text-white border-[#176B45]" : msg.isError ? "bg-red-50 border-red-200 text-red-800" : cn(botBubbleBg, textPrimary))}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>}
                
                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && !msg.abstained && <div className="mt-2 space-y-2">
                    {msg.citations.map((cite, cIdx) => <div key={cIdx} className={cn("p-3 rounded-xl border text-sm", isDarkMode ? "bg-[#2a2a2a] border-[#444] text-gray-300" : "bg-[#f8f7f4] border-[#161412]/10 text-[#161412]/80")}>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <strong className={textPrimary}>{cite.source}</strong>
                          <span className="text-[#176B45] font-medium">— {cite.section || "Relevant Section"}</span>
                        </div>
                        <p className="italic mb-2 opacity-90">"{cite.quote}"</p>
                        <div className="flex items-center gap-3 text-xs opacity-70">
                          <span>{t("assistant.versionCurrent", "Version: Current")}</span>
                          <span>|</span>
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />{t("assistant.statusActive", "Status: Active")}</span>
                          <span>|</span>
                          <a href={cite.url || "#"} target="_blank" rel="noreferrer" className="text-[#176B45] hover:underline flex items-center gap-1">{t("assistant.viewsource", "[View source]")}<ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>)}
                  </div>}

                {msg.role === 'assistant' && (msg.citations || msg.verified_claims) && <button onClick={() => setActiveEvidence(msg)} className="self-start mt-2 text-xs font-medium text-[#176B45] hover:underline">{t("assistant.openEvidencePanel", "Open Evidence Panel →")}</button>}
              </div>
            </div>)}
          {isLoading && <div className="flex gap-4">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border text-[#176B45]", botBubbleBg)}>
                <Bot className="w-4 h-4" />
              </div>
              <div className={cn("p-4 rounded-xl border", botBubbleBg)}>
                <div className="flex gap-1">
                  <span className={cn("w-2 h-2 rounded-full animate-bounce", isDarkMode ? "bg-gray-500" : "bg-[#161412]/40")}></span>
                  <span className={cn("w-2 h-2 rounded-full animate-bounce", isDarkMode ? "bg-gray-500" : "bg-[#161412]/40")} style={{
                animationDelay: '0.2s'
              }}></span>
                  <span className={cn("w-2 h-2 rounded-full animate-bounce", isDarkMode ? "bg-gray-500" : "bg-[#161412]/40")} style={{
                animationDelay: '0.4s'
              }}></span>
                </div>
              </div>
            </div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className={cn("p-4 border-t", isDarkMode ? "border-[#333]" : "border-[#161412]/10", panelBg)}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleUploadDocument} className={cn("p-3.5 rounded-xl border transition-colors shrink-0", isDarkMode ? "bg-[#222] border-[#444] text-gray-300 hover:bg-[#333]" : "bg-[#f8f7f4] border-[#161412]/10 text-[#161412]/60 hover:text-[#161412] hover:bg-[#161412]/5")} title={t("assistant.uploadDocument", "Upload Document")}>
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="relative flex-1 flex items-center">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }} placeholder={t("assistant.askaquestion", "Ask a question...")} className={cn("w-full rounded-xl pl-4 pr-14 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B45]/50 resize-none h-[52px] scrollbar-none transition-colors border", inputBg, textPrimary)} rows={1} />
              <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-2 p-2 rounded-xl bg-[#176B45] text-white disabled:opacity-50 hover:bg-[#125537] transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-[11px] font-medium text-amber-600/80 bg-amber-50/50 inline-block px-3 py-1 rounded-full border border-amber-200/50">{t("assistant.informationnotlegaladvice", "Information, not legal advice: AyuGranth AI provides preliminary analysis and is not a substitute for formal legal review.")}</p>
          </div>
        </form>
      </div>

      {/* Evidence Pane */}
      {activeEvidence && <div className={cn("w-1/3 flex flex-col border rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-right-8 duration-300", isDarkMode ? "bg-[#1a1a1a] border-[#333]" : "bg-[#f8f7f4] border-[#161412]/10")}>
          <div className={cn("px-5 py-4 border-b flex justify-between items-center", isDarkMode ? "bg-[#222] border-[#333]" : "bg-white border-[#161412]/10")}>
            <h3 className={cn("font-serif text-lg", textPrimary)}>{t("assistant.evidencePanel", "Evidence Panel")}</h3>
            <button onClick={() => setActiveEvidence(null)} className={cn("hover:text-red-500", textSecondary)}>✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-gray-300">
            {activeEvidence.confidence !== undefined && <div className="flex items-center gap-2">
                <span className={cn("text-xs font-semibold uppercase", textSecondary)}>{t("assistant.confidenceScore", "Confidence Score")}</span>
                <span className={cn("px-2 py-0.5 rounded text-xs font-bold", activeEvidence.confidence > 0.8 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800")}>
                  {Math.round(activeEvidence.confidence * 100)}%
                </span>
              </div>}

            {activeEvidence.escalated && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-xs font-medium">{t("assistant.thisqueryhasbeen", "This query has been flagged for human legal expert review due to complex domain rules.")}</p>
              </div>}

            {activeEvidence.verified_claims && activeEvidence.verified_claims.length > 0 && <div>
                <h4 className={cn("text-sm font-semibold mb-3 flex items-center gap-2", textPrimary)}>
                  <CheckCircle2 className="w-4 h-4 text-[#176B45]" />{t("assistant.verifiedClaims", "Verified Claims")}</h4>
                <ul className="space-y-2">
                  {activeEvidence.verified_claims.map((claim, i) => <li key={i} className={cn("text-sm p-3 rounded border", isDarkMode ? "bg-[#2a2a2a] border-[#444] text-gray-300" : "bg-white border-[#161412]/10 text-[#161412]/80")}>
                      {claim}
                    </li>)}
                </ul>
              </div>}
          </div>
        </div>}
    </div>;
}