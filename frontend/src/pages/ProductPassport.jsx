import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert, Download, Printer, Share2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils/cn';
import Navbar from '../components/Navbar';
export default function ProductPassport() {
  const {
    t
  } = useTranslation();
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    // Section 1
    productName: '',
    productCategory: 'Proprietary Ayurvedic Medicine',
    countryOfOrigin: 'India',
    language: 'English',
    // Section 2
    keyIngredients: '',
    ingredientSource: '',
    botanicalNames: '',
    traditionalReference: '',
    // Section 3
    manufacturingMethod: '',
    dosageForm: 'Tablet/Capsule',
    intendedUse: '',
    targetUsers: '',
    // Section 4
    proposedHealthClaim: '',
    traditionalUse: '',
    // Section 5
    currentCountry: 'India',
    targetExportCountry: '',
    currentRegulatoryStatus: '',
    certifications: '',
    // Section 6
    userObjective: 'Export readiness'
  });
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleGenerate = e => {
    e.preventDefault();
    setIsGenerating(true);
    // Simulate generation time
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 2000);
  };
  const handlePrint = () => {
    window.print();
  };
  const handleCopyId = () => {
    navigator.clipboard.writeText("AYG-PP-2026-000127");
    alert("Passport ID copied to clipboard!");
  };

  // -------------------------------------------------------------
  // VIEW 1: FORM
  // -------------------------------------------------------------
  if (!isGenerated) {
    return <div className="min-h-screen bg-[#faf8f3] font-sans pb-20">
        <Navbar />

        <main className="max-w-4xl mx-auto pt-[140px] px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-serif text-[#161412] mb-2">{t("productpassport.createProductPassport", "Create Product Passport")}</h1>
            <p className="text-[#161412]/60">{t("productpassport.documentyourformulationto", "Document your formulation to assess patentability, compliance, and export readiness.")}</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-8">

            {/* Section 1 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/10 shadow-sm">
              <h2 className="text-lg font-serif text-[#176B45] mb-5 border-b border-[#161412]/10 pb-2">{t("productpassport.1ProductIdentity", "1. Product Identity")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.productName", "Product Name *")}</label>
                  <input required name="productName" value={formData.productName} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] focus:ring-1 focus:ring-[#176B45]/50 transition-all" placeholder={t("productpassport.egAyushKwathExtract", "e.g. Ayush Kwath Extract")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.productCategory", "Product Category")}</label>
                  <select name="productCategory" value={formData.productCategory} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all">
                    <option>{t("productpassport.proprietaryAyurvedicMedicine", "Proprietary Ayurvedic Medicine")}</option>
                    <option>{t("productpassport.classicalAyurvedicMedicine", "Classical Ayurvedic Medicine")}</option>
                    <option>{t("productpassport.ayurvedicCosmetic", "Ayurvedic Cosmetic")}</option>
                    <option>{t("productpassport.foodSupplementNutraceutical", "Food Supplement / Nutraceutical")}</option>
                    <option>{t("productpassport.herbalExtractAPI", "Herbal Extract / API")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.countryofOrigin", "Country of Origin")}</label>
                  <input name="countryOfOrigin" value={formData.countryOfOrigin} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.primaryLanguage", "Primary Language")}</label>
                  <input name="language" value={formData.language} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" />
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/10 shadow-sm">
              <h2 className="text-lg font-serif text-[#176B45] mb-5 border-b border-[#161412]/10 pb-2">{t("productpassport.2IngredientsOrigin", "2. Ingredients & Origin")}</h2>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.keyIngredients", "Key Ingredients *")}</label>
                  <textarea required name="keyIngredients" value={formData.keyIngredients} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all resize-none" rows={2} placeholder={t("productpassport.commaseparatedlist", "Comma separated list...")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.botanicalScientificNames", "Botanical / Scientific Names")}</label>
                    <input name="botanicalNames" value={formData.botanicalNames} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egWithaniasomnifera", "e.g. Withania somnifera")} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.ingredientSourceOrigin", "Ingredient Source / Origin")}</label>
                    <input name="ingredientSource" value={formData.ingredientSource} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egSourcedfromKerala", "e.g. Sourced from Kerala, India")} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.traditionalClassicalReference", "Traditional / Classical Reference")}</label>
                  <input name="traditionalReference" value={formData.traditionalReference} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egCharakaSamhitaAPI", "e.g. Charaka Samhita, API")} />
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/10 shadow-sm">
              <h2 className="text-lg font-serif text-[#176B45] mb-5 border-b border-[#161412]/10 pb-2">{t("productpassport.3ProductManufacturing", "3. Product & Manufacturing")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.manufacturingMethod", "Manufacturing Method")}</label>
                  <input name="manufacturingMethod" value={formData.manufacturingMethod} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.briefdescriptionofthe", "Brief description of the process...")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.dosageForm", "Dosage Form")}</label>
                  <select name="dosageForm" value={formData.dosageForm} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all">
                    <option>{t("productpassport.tabletCapsule", "Tablet/Capsule")}</option>
                    <option>{t("productpassport.liquidSyrup", "Liquid/Syrup")}</option>
                    <option>{t("productpassport.powderChurna", "Powder/Churna")}</option>
                    <option>{t("productpassport.topicalOilCream", "Topical/Oil/Cream")}</option>
                    <option>{t("productpassport.other", "Other")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.targetUsers", "Target Users")}</label>
                  <input name="targetUsers" value={formData.targetUsers} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egAdultsChildren12yrs", "e.g. Adults, Children > 12yrs")} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.intendedUse", "Intended Use")}</label>
                  <textarea name="intendedUse" value={formData.intendedUse} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all resize-none" rows={2} placeholder={t("productpassport.whatisthisproduct", "What is this product used for?")} />
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/10 shadow-sm">
              <h2 className="text-lg font-serif text-[#176B45] mb-5 border-b border-[#161412]/10 pb-2">{t("productpassport.4ClaimsDocumentation", "4. Claims & Documentation")}</h2>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.proposedHealthClaim", "Proposed Health Claim")}</label>
                  <input name="proposedHealthClaim" value={formData.proposedHealthClaim} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egHelpsboostimmunity", "e.g. Helps boost immunity")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.traditionalUse", "Traditional Use")}</label>
                  <input name="traditionalUse" value={formData.traditionalUse} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egUsedtraditionallyfor", "e.g. Used traditionally for Rasayana therapy")} />
                </div>
                <div className="pt-2">
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.supportingDocumentation", "Supporting Documentation")}</label>
                  <div className="border-2 border-dashed border-[#161412]/20 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#f8f7f4]/50 hover:bg-[#f8f7f4] transition-colors cursor-pointer">
                    <span className="bg-white border border-[#161412]/10 rounded-full px-4 py-2 text-sm font-medium text-[#161412]/80 shadow-sm mb-3">{t("productpassport.browseFiles", "Browse Files")}</span>
                    <p className="text-xs text-[#161412]/50">{t("productpassport.uploadPDFsDOCsor", "Upload PDFs, DOCs, or images (Optional)")}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/10 shadow-sm">
              <h2 className="text-lg font-serif text-[#176B45] mb-5 border-b border-[#161412]/10 pb-2">{t("productpassport.5ExportStatus", "5. Export Status")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.currentCountryofMarket", "Current Country of Market")}</label>
                  <input name="currentCountry" value={formData.currentCountry} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.targetExportCountry", "Target Export Country")}</label>
                  <input name="targetExportCountry" value={formData.targetExportCountry} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egUSAEUUAE", "e.g. USA, EU, UAE")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.currentRegulatoryStatus", "Current Regulatory Status")}</label>
                  <input name="currentRegulatoryStatus" value={formData.currentRegulatoryStatus} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egLicensedbyAYUSH", "e.g. Licensed by AYUSH")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.existingCertifications", "Existing Certifications")}</label>
                  <input name="certifications" value={formData.certifications} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all" placeholder={t("productpassport.egGMPISO", "e.g. GMP, ISO")} />
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section className="bg-white p-6 md:p-8 rounded-2xl border border-[#161412]/10 shadow-sm mb-6">
              <h2 className="text-lg font-serif text-[#176B45] mb-5 border-b border-[#161412]/10 pb-2">{t("productpassport.6UserObjective", "6. User Objective")}</h2>
              <div>
                <label className="block text-sm font-medium text-[#161412] mb-1.5">{t("productpassport.whatwouldyoulike", "What would you like help with?")}</label>
                <select name="userObjective" value={formData.userObjective} onChange={handleChange} className="w-full bg-[#f8f7f4] text-[#161412] border border-[#161412]/15 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#176B45] transition-all">
                  <option>{t("productpassport.exportreadinessassessment", "Export readiness assessment")}</option>
                  <option>{t("productpassport.patentabilityNoveltycheck", "Patentability / Novelty check")}</option>
                  <option>{t("productpassport.traditionalknowledgedocumentation", "Traditional knowledge documentation")}</option>
                  <option>{t("productpassport.regulatorycomplianceresearch", "Regulatory compliance research")}</option>
                  <option>{t("productpassport.generalproductanalysis", "General product analysis")}</option>
                </select>
              </div>
            </section>

            <div className="pt-4 flex justify-end gap-4">
              <Link to="/ask-aayugranth" className="px-6 py-3.5 text-sm font-medium text-[#161412] bg-white border border-[#161412]/20 rounded-xl hover:bg-[#161412]/5 transition-colors">{t("productpassport.cancel", "Cancel")}</Link>
              <button type="submit" disabled={isGenerating || !formData.productName || !formData.keyIngredients} className="flex items-center gap-2 px-8 py-3.5 text-sm font-medium text-white bg-[#176B45] rounded-xl hover:bg-[#125537] transition-all disabled:opacity-70 disabled:hover:bg-[#176B45] shadow-[0_4px_14px_rgba(23,107,69,0.25)]">
                {isGenerating ? <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>{t("productpassport.generatingPassport", "Generating Passport...")}</> : "Generate Product Passport"}
              </button>
            </div>
          </form>
        </main>
      </div>;
  }

  // -------------------------------------------------------------
  // VIEW 2: PRODUCT PASSPORT RESULT (PRINTABLE CARD)
  // -------------------------------------------------------------
  return <div className="min-h-screen bg-[#161412]/5 font-sans pt-8 pb-20 print:bg-white print:pt-0 print:pb-0">

      {/* Top Action Bar (hidden in print) */}
      <div className="max-w-[1000px] mx-auto px-4 mb-6 flex items-center justify-between print:hidden">
        <button onClick={() => setIsGenerated(false)} className="flex items-center gap-2 text-[#161412]/60 hover:text-[#161412] transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />{t("productpassport.editInformation", "Edit Information")}</button>
        <div className="flex gap-3">
          <button onClick={handleCopyId} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#161412]/15 rounded-lg text-sm font-medium text-[#161412] hover:bg-[#161412]/5 transition-colors shadow-sm">
            <Share2 className="w-4 h-4" />{t("productpassport.copyID", "Copy ID")}</button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[#176B45] border border-[#176B45] rounded-lg text-sm font-medium text-white hover:bg-[#125537] transition-colors shadow-[0_2px_8px_rgba(23,107,69,0.2)]">
            <Download className="w-4 h-4" />{t("productpassport.downloadPDF", "Download PDF")}</button>
        </div>
      </div>

      {/* The Passport Document */}
      <div className="max-w-[1000px] mx-auto px-4 print:px-0">
        <div className="bg-[#FFFCF6] border border-[#161412]/15 shadow-xl print:shadow-none print:border-none overflow-hidden" style={{
        minHeight: '800px'
      }}>

          {/* Document Header */}
          <div className="bg-[#176B45] px-10 py-8 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-64 opacity-10 pointer-events-none flex items-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-96 h-96 -mr-20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" /></svg>
            </div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2.5 mb-6">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#FF9933]" />
                  <span className="font-sans font-bold tracking-[0.2em] text-xs uppercase text-white/90">{t("productpassport.aayuGranthOfficialDocument", "AayuGranth Official Document")}</span>
                </div>
                <h1 className="font-serif text-4xl mb-2">{t("productpassport.pRODUCTPASSPORT", "PRODUCT PASSPORT")}</h1>
                <p className="text-white/80 text-sm max-w-md">{t("productpassport.documentedforpreliminaryassessment", "Documented for preliminary assessment of traditional knowledge, compliance, and export readiness.")}</p>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-left inline-block">
                  <div className="text-xs text-white/60 font-medium mb-1 uppercase tracking-wider">{t("productpassport.passportID", "Passport ID")}</div>
                  <div className="font-mono text-lg font-bold tracking-widest text-white">{t("productpassport.aYGPP2026000127", "AYG-PP-2026-000127")}</div>
                  <div className="text-[10px] text-white/50 mt-1">{t("productpassport.generated", "Generated:")}{new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Left Column: Details */}
            <div className="md:col-span-2 space-y-8">

              {/* Product Identity */}
              <section>
                <h3 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-4 border-b border-[#161412]/10 pb-2">{t("productpassport.1ProductIdentity", "1. Product Identity")}</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.productName", "Product Name")}</div>
                    <div className="font-serif text-xl text-[#161412]">{formData.productName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.category", "Category")}</div>
                    <div className="text-sm font-medium text-[#161412]">{formData.productCategory}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.origin", "Origin")}</div>
                    <div className="text-sm font-medium text-[#161412]">{formData.countryOfOrigin}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.language", "Language")}</div>
                    <div className="text-sm font-medium text-[#161412]">{formData.language}</div>
                  </div>
                </div>
              </section>

              {/* Formulation */}
              <section>
                <h3 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-4 border-b border-[#161412]/10 pb-2">{t("productpassport.2FormulationManufacturing", "2. Formulation & Manufacturing")}</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.keyIngredients", "Key Ingredients")}</div>
                    <div className="text-sm text-[#161412] leading-relaxed">{formData.keyIngredients}</div>
                  </div>
                  {formData.botanicalNames && <div className="col-span-2">
                      <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.botanicalNames", "Botanical Names")}</div>
                      <div className="text-sm text-[#161412] italic">{formData.botanicalNames}</div>
                    </div>}
                  {formData.traditionalReference && <div className="col-span-2">
                      <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.traditionalReference", "Traditional Reference")}</div>
                      <div className="text-sm font-medium text-[#176B45] bg-[#176B45]/5 inline-block px-2 py-1 rounded border border-[#176B45]/10 mt-1">{formData.traditionalReference}</div>
                    </div>}
                  <div>
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.dosageForm", "Dosage Form")}</div>
                    <div className="text-sm text-[#161412]">{formData.dosageForm}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.manufacturingMethod", "Manufacturing Method")}</div>
                    <div className="text-sm text-[#161412] truncate" title={formData.manufacturingMethod}>{formData.manufacturingMethod || 'Not specified'}</div>
                  </div>
                </div>
              </section>

              {/* Claims & Use */}
              <section>
                <h3 className="text-xs font-bold text-[#176B45] uppercase tracking-widest mb-4 border-b border-[#161412]/10 pb-2">{t("productpassport.3ClaimsTargetMarket", "3. Claims & Target Market")}</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.proposedHealthClaim", "Proposed Health Claim")}</div>
                    <div className="text-sm text-[#161412] font-medium">{formData.proposedHealthClaim || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.intendedUse", "Intended Use")}</div>
                    <div className="text-sm text-[#161412]">{formData.intendedUse || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[#161412]/50 font-bold mb-1 tracking-wider">{t("productpassport.targetExportMarket", "Target Export Market")}</div>
                    <div className="text-sm font-medium text-[#161412]">{formData.targetExportCountry || 'None'}</div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: AI Analysis */}
            <div className="md:col-span-1 space-y-6">

              {/* Export Readiness Score */}
              <div className="bg-white border border-[#161412]/15 p-5 rounded-xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#eab308]"></div>
                <h4 className="text-[10px] uppercase font-bold text-[#161412]/50 tracking-wider mb-2">{t("productpassport.exportReadiness", "Export Readiness")}</h4>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-serif text-[#161412]">72</span>
                  <span className="text-sm text-[#161412]/40 font-medium mb-1.5">/100</span>
                </div>
                <div className="inline-block px-2.5 py-1 rounded bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase tracking-wider mb-4 border border-yellow-200">{t("productpassport.requiresDocumentation", "Requires Documentation")}</div>
                <ul className="space-y-2 text-xs text-[#161412]/80">
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />{t("productpassport.productidentitydocumented", "Product identity documented")}</li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />{t("productpassport.ingredientsspecified", "Ingredients specified")}</li>
                  <li className="flex items-start gap-1.5 text-yellow-700"><ShieldAlert className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />{t("productpassport.targetcountryrequirementsneed", "Target country requirements need verification")}</li>
                  <li className="flex items-start gap-1.5 text-yellow-700"><ShieldAlert className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />{t("productpassport.missingqualitycertifications", "Missing quality certifications")}</li>
                </ul>
              </div>

              {/* What does AayuGranth say? */}
              <div className="bg-[#176B45]/5 border border-[#176B45]/15 p-5 rounded-xl">
                <h4 className="font-serif text-[#176B45] text-lg mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" />{t("productpassport.aayuGranthAnalysis", "AayuGranth Analysis")}</h4>

                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#176B45]/70 tracking-wider mb-1">{t("productpassport.traditionalKnowledge", "Traditional Knowledge")}</div>
                    <p className="text-xs text-[#161412]/80 leading-relaxed">
                      {formData.traditionalReference ? `Formulation cites ${formData.traditionalReference}. Ensure compliance with biological diversity regulations (ABS) if utilizing Indian bio-resources.` : "No classical reference provided. Verify if formulation utilizes traditional knowledge to avoid misappropriation."}
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#176B45]/70 tracking-wider mb-1">{t("productpassport.patentConsideration", "Patent Consideration")}</div>
                    <p className="text-xs text-[#161412]/80 leading-relaxed">{t("productpassport.preliminarycheckrecommendedagainst", "Preliminary check recommended against TKDL and prior art to confirm novelty, especially for export markets.")}</p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#176B45]/70 tracking-wider mb-1">{t("productpassport.documentationGaps", "Documentation Gaps")}</div>
                    <p className="text-xs text-[#161412]/80 leading-relaxed">{t("productpassport.missing", "Missing")}{formData.certifications ? '' : 'Certifications (GMP, ISO), '} {formData.ingredientSource ? '' : 'Clear Ingredient Sourcing, '}{t("productpassport.andformallabtesting", "and formal lab testing reports.")}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Disclaimer */}
          <div className="bg-[#161412]/5 px-10 py-4 border-t border-[#161412]/10 text-[10px] text-[#161412]/50 text-center uppercase tracking-wider font-medium">{t("productpassport.preliminaryassessmentbasedon", "Preliminary assessment based on user-provided information. Not a legal certification or government approval.")}</div>
        </div>
      </div>
    </div>;
}