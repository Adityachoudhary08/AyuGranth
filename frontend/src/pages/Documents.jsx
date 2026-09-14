import { useTranslation } from "react-i18next";
import { useState, useRef } from 'react';
import { UploadCloud, File, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { documentsApi } from '../api';
import { cn } from '../lib/utils/cn';
export default function Documents() {
  const {
    t
  } = useTranslation();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const handleFileChange = e => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };
  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const response = await documentsApi.uploadDocument(file);
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload and analyze document.');
    } finally {
      setIsUploading(false);
    }
  };
  return <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-[#176B45] mb-2 flex items-center gap-3">
          <FileText className="w-8 h-8" />{t("documents.documentLibraryAnalysis", "Document Library & Analysis")}</h1>
        <p className="text-[#161412]/60">{t("documents.uploadpatentdraftsresearch", "Upload patent drafts, research papers, or formulation descriptions for automated extraction and patent-readiness scoring.")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#161412]/10 rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
            <input type="file" ref={fileInputRef} className="hidden" accept={t("documents.pdftxtdocx", ".pdf,.txt,.docx")} onChange={handleFileChange} />
            
            <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-[#161412]/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#176B45] hover:bg-[#176B45]/5 transition-colors">
              <UploadCloud className="w-10 h-10 text-[#161412]/40 mb-3" />
              <p className="text-sm font-medium text-[#161412]">{t("documents.clicktouploaddocument", "Click to upload document")}</p>
              <p className="text-xs text-[#161412]/50 mt-1">{t("documents.pDFTXTupto", "PDF, TXT up to 50MB")}</p>
            </div>

            {file && <div className="w-full mt-4 p-3 bg-[#f8f7f4] border border-[#161412]/10 rounded flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <File className="w-4 h-4 text-[#176B45] shrink-0" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                </div>
                <button onClick={() => setFile(null)} className="text-[#161412]/40 hover:text-red-500 text-sm">✕</button>
              </div>}

            <button onClick={handleUpload} disabled={!file || isUploading} className="w-full mt-4 py-2 bg-[#176B45] text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-[#125537] transition-colors flex items-center justify-center gap-2">
              {isUploading ? <>
                  <RefreshCw className="w-4 h-4 animate-spin" />{t("documents.analyzing", "Analyzing...")}</> : 'Upload & Analyze'}
            </button>

            {error && <div className="mt-4 w-full p-3 bg-red-50 text-red-800 border border-red-200 rounded text-xs text-left">
                {error}
              </div>}
          </div>
        </div>

        {/* Results Zone */}
        <div className="lg:col-span-2">
          {!result && !isUploading && <div className="h-full bg-white border border-[#161412]/10 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-12">
              <FileText className="w-12 h-12 text-[#161412]/20 mb-4" />
              <h3 className="font-medium text-[#161412]">{t("documents.noDocumentAnalyzed", "No Document Analyzed")}</h3>
              <p className="text-sm text-[#161412]/50 mt-1">{t("documents.uploadadocumentto", "Upload a document to see extraction and patent-readiness results.")}</p>
            </div>}

          {isUploading && <div className="h-full bg-white border border-[#161412]/10 rounded-xl flex flex-col items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-[#176B45]/20 border-t-[#176B45] rounded-full animate-spin mb-4"></div>
              <p className="font-medium text-[#161412]">{t("documents.processingDocument", "Processing Document...")}</p>
              <p className="text-sm text-[#161412]/50 mt-1">{t("documents.extractingentitiesandassessing", "Extracting entities and assessing readiness.")}</p>
            </div>}

          {result && <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-white border border-[#161412]/10 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#161412]/10 flex items-center justify-between bg-[#f8f7f4]">
                  <h3 className="font-serif text-lg text-[#161412]">{t("documents.analysisReport", "Analysis Report:")}{result.filename}</h3>
                  <span className="px-3 py-1 bg-[#176B45]/10 text-[#176B45] font-bold text-sm rounded-full">{t("documents.score", "Score:")}{result.readiness_score}/100
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-[#161412] mb-3">{t("documents.extractedEntities", "Extracted Entities")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.extracted_entities?.map((ent, idx) => <span key={idx} className="px-2 py-1 bg-[#161412]/5 border border-[#161412]/10 rounded text-xs font-medium">
                          {ent}
                        </span>)}
                      {(!result.extracted_entities || result.extracted_entities.length === 0) && <span className="text-sm text-[#161412]/50 italic">{t("documents.nospecificentitiesdetected", "No specific entities detected.")}</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[#161412] mb-3">{t("documents.checklistPatentDraft", "Checklist (Patent Draft)")}</h4>
                    <ul className="space-y-2">
                      {result.checklist?.present?.map((item, idx) => <li key={`p-${idx}`} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-[#161412]/80">{item}</span>
                        </li>)}
                      {result.checklist?.missing?.map((item, idx) => <li key={`m-${idx}`} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <span className="text-[#161412]/80">{item}</span>
                        </li>)}
                    </ul>
                  </div>
                </div>

                {result.guidance && <div className="px-6 py-4 bg-[#f8f7f4] border-t border-[#161412]/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#161412]/50 mb-2">{t("documents.guidance", "Guidance")}</h4>
                    <p className="text-sm text-[#161412]/80 leading-relaxed">{result.guidance}</p>
                  </div>}
              </div>
            </div>}
        </div>
      </div>
    </div>;
}