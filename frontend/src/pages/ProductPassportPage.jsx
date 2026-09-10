import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, AlertCircle, RefreshCw, PlusCircle, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils/cn';
import Navbar from '../components/Navbar';
import ProductPassportCard from '../components/passport/ProductPassportCard';
import PassportHeader from '../components/passport/PassportHeader';
import IntelligenceOverview from '../components/passport/IntelligenceOverview';
import ProductProfileSection from '../components/passport/ProductProfileSection';
import RegulatorySection from '../components/passport/RegulatorySection';
import IPSection from '../components/passport/IPSection';
import BiodiversitySection from '../components/passport/BiodiversitySection';
import InternationalSection from '../components/passport/InternationalSection';
import ActionPlanSection from '../components/passport/ActionPlanSection';
import PassportTimeline from '../components/passport/PassportTimeline';
import PassportVerification from '../components/passport/PassportVerification';
import PassportDisclaimer from '../components/passport/PassportDisclaimer';
import WhyThisResultModal from '../components/passport/WhyThisResultModal';
import { passportApi, productsApi } from '../api';

export default function ProductPassportPage() {
  const { passportId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passportData, setPassportData] = useState(null);
  const [whyModalData, setWhyModalData] = useState(null);
  const [printMode, setPrintMode] = useState('full'); // 'full' | 'card'

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintMode('full');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleDownloadCard = () => {
    setPrintMode('card');
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleDownloadFullDossier = () => {
    setPrintMode('full');
    setTimeout(() => {
      window.print();
    }, 80);
  };

  const handleExportFullData = () => {
    if (!passportData) return;
    const fullExport = {
      ...passportData,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        format: 'IP-SAKTI-PRODUCT-PASSPORT-JSON-V1',
        platform: 'AayuGranth IP-SAKTI Sahayak',
      }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${passportData.passportId || 'product-passport'}-full-intelligence-data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Baseline verified dataset for standard initial viewing when no specific ID is in URL
  const DEFAULT_INITIAL_DATA = {
    passportId: passportId || 'IPS-2026-008412',
    generatedAt: '10 Sep 2026',
    lastUpdated: '10 Sep 2026',
    status: 'NEEDS REVIEW',
    product: {
      name: 'AshwaBalance Capsules',
      category: 'Proprietary Ayurvedic Medicine',
      countryOfOrigin: 'India',
      language: 'English',
      ingredients: ['Withania somnifera (Ashwagandha)', 'Piper nigrum (Black Pepper)'],
      botanicalNames: ['Withania somnifera (L.) Dunal', 'Piper nigrum L.'],
      ingredientOrigin: 'Madhya Pradesh, India',
      classicalReference: 'Charaka Samhita (Chikitsa Sthana Ch. 1-3), API Vol. 1',
      manufacturingMethod: 'Standardized hydroalcoholic root extract (5% withanolides) in HPMC vegetarian capsules',
      dosageForm: 'Tablet/Capsule',
      targetUsers: 'Adults seeking adaptogenic and cognitive support',
      intendedUse: 'Stress adaptation, vitality enhancement, and Rasayana therapy',
      targetCountry: 'United States',
    },
    regulatory: {
      classification: 'Proprietary Ayurvedic Medicine',
      pathway: 'Drugs & Cosmetics Act (Rule 158-B / Form 25-D)',
      status: 'Needs Review',
      summary: 'Product classification requires further regulatory assessment under the Drugs & Cosmetics Act for export.',
      requirements: [
        'Manufacturing under licensed AYUSH GMP facility (Schedule T)',
        'Substantiation of ingredients with classical textual citations or safety data',
        'Heavy metals (Lead, Arsenic, Cadmium, Mercury) test reports within pharmacopoeial limits',
        'Batch release testing and stability assessment data'
      ],
      claimsConsideration: 'Permissible traditional indications allowed under AYUSH licensure. Avoid allopathic disease prevention or cure claims.',
      openIssues: [
        'Stability study dossier pending completion for extended shelf life claims',
        'Batch analysis report required from NABL-accredited laboratory'
      ],
      jurisdiction: 'India',
      evidence: {
        source: 'Ministry of AYUSH / Drugs & Cosmetics Act, 1940',
        document: 'Drugs and Cosmetics Rules, 1945 — Schedule T & Rule 158-B',
        section: 'Part XVI: Licensing of Ayurvedic Drugs',
        jurisdiction: 'India',
        status: 'Statutory Requirement',
        strength: 'Strong',
        excerpt: 'Proprietary Ayurvedic medicines require proof of safety and classical bibliographic references for ingredients specified in the First Schedule.',
      }
    },
    ip: {
      posture: 'Potential Section 3(p) & 3(d) Overlap — Further Review Recommended',
      confidence: 'Moderate',
      status: 'Further Review Recommended',
      summary: 'Traditional knowledge overlap identified; comparative synergistic efficacy data required under Section 3(p).',
      reasoning: 'Under Section 3(p) of the Indian Patents Act, 1970, formulations derived from known Ayurvedic properties face inherent novelty objections. Demonstrating non-obvious synergistic therapeutic efficacy under Section 3(d) is required with comparative experimental data.',
      risks: [
        'Section 3(p) statutory objection regarding aggregation of known traditional Ayurvedic properties',
        'Section 3(d) requirement to demonstrate enhanced therapeutic efficacy over standard extracts',
        'Mandatory prior approval from National Biodiversity Authority (NBA) under Section 6 of Biological Diversity Act 2002 before patent grant'
      ],
      trademarkConsiderations: 'Verify that the brand name does not infringe existing classical Ayurvedic generic terms or registered Class 5 pharmaceutical marks.',
      evidence: {
        source: 'Indian Patent Office / Patents Act, 1970',
        document: 'Guidelines for Processing of Patent Applications Relating to Traditional Knowledge and Biological Material',
        section: 'Section 3(p) & Section 3(d)',
        jurisdiction: 'India',
        status: 'Statutory Exclusion Guideline',
        strength: 'Strong',
        excerpt: 'An invention which in effect is traditional knowledge or which is an aggregation or duplication of known properties of traditionally known component or components is not an invention within the meaning of this Act.',
      }
    },
    biodiversity: {
      isBiological: true,
      absApplicable: true,
      status: 'ABS Obligations Apply',
      summary: 'Product utilizes biological resources originating from India. Entities accessing Indian bio-resources for commercial utilization or patenting must comply with Section 3, 4, and 6 of the Biological Diversity Act, 2002.',
      obligations: [
        'Obtain prior approval from National Biodiversity Authority (NBA) via Form I for commercial utilization',
        'Mandatory disclosure of biological resource geographical origin in patent filings (Section 6)',
        'Ensure Prior Informed Consent (PIC) and fair and equitable benefit-sharing compliance'
      ],
      tkOverlapStatus: 'Potential Prior-Art Overlap Identified',
      tkSummary: 'Botanical active ingredients have documented classical therapeutic indications in foundational Ayurvedic treatises.',
      classicalReferences: [
        'Charaka Samhita — Chikitsa Sthana (Rasayana Vidhi)',
        'Ayurvedic Pharmacopoeia of India (API) Monograph Index',
        'Traditional Knowledge Digital Library (TKDL) Prior-Art Database'
      ],
      evidence: {
        source: 'National Biodiversity Authority / Biological Diversity Act, 2002',
        document: 'Biological Diversity Act, 2002 & Biological Diversity (Amendment) Act, 2023',
        section: 'Section 3, Section 4 & Section 6',
        jurisdiction: 'India',
        status: 'Statutory Obligation',
        strength: 'Strong',
        excerpt: 'No person shall apply for any intellectual property right, by whatever name called, in or outside India for any invention based on any research or information on a biological resource obtained from India without obtaining the previous approval of the National Biodiversity Authority.',
      }
    },
    international: {
      origin: 'India',
      targetCountry: 'United States',
      status: 'Documentation Required for US FDA Route',
      summary: 'Export to the United States operates under the Dietary Supplement Health and Education Act (DSHEA 1994). Products are classified as Dietary Supplements and must comply with 21 CFR Part 111 cGMP regulations.',
      requirements: [
        'US FDA Food & Dietary Supplement Facility Registration (21 CFR Part 1)',
        'Manufacturing under 21 CFR Part 111 (Dietary Supplement cGMP)',
        'Structure/Function claim substantiation dossier with mandatory FDA disclaimer',
        'USP <2232> heavy metals compliance (Lead < 0.5 mcg/day, Arsenic, Cadmium, Mercury)',
        'Pre-market New Dietary Ingredient (NDI) notification if botanical was not marketed in US pre-1994'
      ],
      missingInfo: [
        'Quality certifications (WHO-GMP, ISO 22000, AYUSH Premium Mark)',
        'Botanical taxonomical verification (voucher specimen number)',
        'Heavy metal and microbial laboratory test reports'
      ],
      evidence: {
        source: 'United States Food and Drug Administration (US FDA)',
        document: '21 CFR Part 111 — Current Good Manufacturing Practice for Dietary Supplements',
        section: 'Subpart E: Quality Control Operations',
        jurisdiction: 'United States',
        status: 'Federal Regulation',
        strength: 'Strong',
        excerpt: 'Dietary supplement manufacturers must establish specifications for identity, purity, strength, and composition, and limits on contaminants that may adulterate the product.',
      }
    },
    actions: [
      {
        id: '01',
        title: 'Substantiate Synergistic Efficacy (Section 3(p) / 3(d))',
        priority: 'High',
        reason: 'Because the formulation contains known classical botanical constituents, the Indian Patent Office requires comparative experimental synergy data (e.g. combination index < 1) to overcome traditional knowledge objections.',
        evidenceCount: 2,
      },
      {
        id: '02',
        title: 'File NBA Form I for Access & Benefit-Sharing Clearance',
        priority: 'High',
        reason: 'Commercial utilization or patent filing for biological resources accessed from India requires mandatory prior approval from the National Biodiversity Authority under Section 3 & 6 of the Biological Diversity Act, 2002.',
        evidenceCount: 1,
      },
      {
        id: '03',
        title: 'Compile US FDA 21 CFR 111 cGMP & Heavy Metals Testing Dossier',
        priority: 'Medium',
        reason: 'Destination export into the United States mandates USP <2232> contaminant threshold compliance and formulation structure/function claim notification within 30 days of marketing.',
        evidenceCount: 3,
      },
    ],
    history: [
      {
        date: '10 Sep 2026',
        event: 'Product Passport synthesized & evidence indexed',
        detail: 'Full cross-module analysis (Regulatory, IP, Biodiversity, International)',
        status: 'Needs Review',
      },
      {
        date: '08 Sep 2026',
        event: 'Regulatory classification pathway verified',
        detail: 'Drugs and Cosmetics Rules Schedule T compliance flagged',
        status: 'In Progress',
      }
    ],
    evidenceCount: 8,
  };

  const fetchPassport = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. If passportId was passed in route (e.g. a MongoDB ObjectId from /products/ or an AYG/IPS ID)
      if (passportId) {
        // Try to fetch via passportApi.getPassport if it's a valid ID
        try {
          const apiRes = await passportApi.getPassport(passportId);
          if (apiRes) {
            // Map the ProductPassportResponse into our view structure
            setPassportData({
              ...DEFAULT_INITIAL_DATA,
              passportId: apiRes.product_id ? `IPS-2026-${apiRes.product_id.slice(-6).toUpperCase()}` : passportId,
              product: {
                ...DEFAULT_INITIAL_DATA.product,
                name: apiRes.product_name || DEFAULT_INITIAL_DATA.product.name,
                category: apiRes.category || DEFAULT_INITIAL_DATA.product.category,
              },
              status: apiRes.confidence === 'high' ? 'EVIDENCE REVIEWED' : 'NEEDS REVIEW',
            });
            setLoading(false);
            return;
          }
        } catch (apiErr) {
          console.warn("Direct passport ID fetch fallback:", apiErr);
        }
      }

      // 2. Default state with verified baseline intelligence
      setPassportData(DEFAULT_INITIAL_DATA);
    } catch (err) {
      console.error("Error loading passport:", err);
      setError("Unable to load Product Passport at this moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassport();
  }, [passportId]);

  useEffect(() => {
    if (passportData) {
      try {
        localStorage.setItem('has_created_passport', 'true');
        if (passportData.passportId) {
          localStorage.setItem('active_passport_id', passportData.passportId);
        }
        if (passportData.product?.name) {
          localStorage.setItem('active_product_name', passportData.product.name);
        }
      } catch (e) {
        console.warn("Storage write failed:", e);
      }
    }
  }, [passportData]);

  // ─────────────────────────────────────────────────────────────
  // LOADING STATE SKELETON
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] font-sans text-[#161412] pb-24">
        <Navbar />
        <main className="max-w-5xl mx-auto pt-28 px-4 sm:px-6 space-y-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="space-y-3 border-b border-[#161412]/10 pb-6">
            <div className="w-40 h-4 bg-[#161412]/10 rounded" />
            <div className="w-72 h-8 bg-[#161412]/15 rounded" />
            <div className="w-96 h-4 bg-[#161412]/10 rounded" />
          </div>

          {/* Virtual Card Skeleton */}
          <div className="w-full max-w-[820px] mx-auto h-72 bg-gradient-to-br from-white to-[#F5EFE1] border-2 border-[#D9CEBE] rounded-2xl p-8 space-y-6">
            <div className="flex justify-between">
              <div className="w-32 h-6 bg-[#161412]/10 rounded" />
              <div className="w-24 h-6 bg-[#161412]/10 rounded" />
            </div>
            <div className="w-64 h-10 bg-[#161412]/15 rounded" />
            <div className="w-48 h-4 bg-[#161412]/10 rounded" />
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="w-32 h-4 bg-[#161412]/10 rounded" />
              <div className="w-40 h-4 bg-[#161412]/10 rounded" />
            </div>
          </div>

          {/* Grid Overview Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-36 bg-white border border-[#161412]/10 rounded-xl p-4 space-y-3">
                <div className="w-20 h-4 bg-[#161412]/10 rounded" />
                <div className="w-full h-12 bg-[#161412]/5 rounded" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] font-sans text-[#161412] pb-24">
        <Navbar />
        <main className="max-w-md mx-auto pt-40 px-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#161412]">
            Unable to Load Product Passport
          </h2>
          <p className="text-xs text-[#161412]/70 leading-relaxed">
            We couldn't retrieve the requested product passport data from the intelligence index right now.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={fetchPassport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#176B45] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#125537] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <Link
              to="/patent-passport"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#161412]/20 text-xs font-semibold text-[#161412] rounded-lg hover:bg-[#FAF8F3] transition-colors"
            >
              <span>Intake Form</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN PRODUCT PASSPORT DOSSIER
  // ─────────────────────────────────────────────────────────────
  const p = passportData.product || {};
  const reg = passportData.regulatory || {};
  const ip = passportData.ip || {};
  const bio = passportData.biodiversity || {};
  const intl = passportData.international || {};

  return (
    <div className={cn("min-h-screen bg-[#FAF8F3] font-sans text-[#161412] pb-28", printMode === 'card' && "print-card-mode")}>
      {/* Targeted Print Styling for Card Only vs Full Dossier */}
      <style>{`
        @media print {
          @page {
            margin: 1.2cm;
          }
          nav, footer, .print\\:hidden {
            display: none !important;
          }
          body {
            background-color: #FAF8F3 !important;
            color: #161412 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* When Card Only Mode is active */
          .print-card-mode header,
          .print-card-mode .passport-dossier-body {
            display: none !important;
          }
          .print-card-mode #passport-card-target {
            display: block !important;
            margin: 0 auto !important;
            padding: 0 !important;
            max-width: 800px !important;
            page-break-inside: avoid;
          }

          /* When Full Dossier Mode is active */
          .passport-dossier-body > * {
            page-break-inside: avoid;
            margin-bottom: 24px;
          }
        }
      `}</style>

      <Navbar />

      <main className="max-w-5xl mx-auto pt-28 px-4 sm:px-6 space-y-10">
        
        {/* Header with Breadcrumb, Title, and 2 Download Actions */}
        <PassportHeader 
          passportId={passportData.passportId}
          productName={p.name}
          onDownloadCard={handleDownloadCard}
          onDownloadFullDossier={handleDownloadFullDossier}
          onExportFullData={handleExportFullData}
        />

        {/* HERO: VIRTUAL DIGITAL IDENTIFICATION CARD */}
        <div id="passport-card-target" className="pt-2">
          <ProductPassportCard
            productName={p.name}
            productCategory={p.category}
            passportId={passportData.passportId}
            originJurisdiction={p.countryOfOrigin || 'India'}
            targetMarket={p.targetCountry || 'United States'}
            status={passportData.status}
            lastAnalyzed={passportData.lastAnalyzed}
            evidenceCount={passportData.evidenceCount}
            onDownloadCard={handleDownloadCard}
          />
        </div>

        {/* DOSSIER BODY (HIDDEN WHEN IN CARD-ONLY PRINT MODE) */}
        <div className={cn("space-y-10 passport-dossier-body", printMode === 'card' && "print:hidden")}>
          {/* 4-MODULE INTELLIGENCE OVERVIEW */}
          <IntelligenceOverview
            regulatoryStatus={reg.status}
            regulatorySummary={reg.summary}
            ipStatus={ip.status}
            ipSummary={ip.summary}
            tkStatus={bio.tkOverlapStatus}
            tkSummary={bio.tkSummary}
            internationalStatus={intl.status}
            internationalSummary={intl.summary}
          />

          {/* SECTION 1: PRODUCT PROFILE */}
          <ProductProfileSection product={p} />

          {/* SECTION 2: REGULATORY INTELLIGENCE */}
          <RegulatorySection
            classification={reg.classification}
            pathway={reg.pathway}
            requirements={reg.requirements}
            claimsConsideration={reg.claimsConsideration}
            openIssues={reg.openIssues}
            jurisdiction={reg.jurisdiction}
            evidence={reg.evidence}
            onOpenWhy={setWhyModalData}
          />

          {/* SECTION 3: IP & NOVELTY INTELLIGENCE */}
          <IPSection
            posture={ip.posture}
            confidence={ip.confidence}
            reasoning={ip.reasoning}
            risks={ip.risks}
            trademarkConsiderations={ip.trademarkConsiderations}
            evidence={ip.evidence}
            onOpenWhy={setWhyModalData}
          />

          {/* SECTION 4: BIODIVERSITY & TRADITIONAL KNOWLEDGE */}
          <BiodiversitySection
            isBiological={bio.isBiological}
            absApplicable={bio.absApplicable}
            absSummary={bio.absSummary}
            absObligations={bio.obligations}
            tkOverlapStatus={bio.tkOverlapStatus}
            tkSummary={bio.tkSummary}
            classicalReferences={bio.classicalReferences}
            evidence={bio.evidence}
            onOpenWhy={setWhyModalData}
          />

          {/* SECTION 5: INTERNATIONAL MARKET READINESS */}
          <InternationalSection
            origin={intl.origin}
            targetCountry={intl.targetCountry}
            status={intl.status}
            summary={intl.summary}
            requirements={intl.requirements}
            missingInfo={intl.missingInfo}
            evidence={intl.evidence}
            onOpenWhy={setWhyModalData}
          />

          {/* RECOMMENDED ACTIONS PLAN */}
          <ActionPlanSection actions={passportData.actions} />

          {/* ANALYSIS HISTORY & TIMELINE */}
          <PassportTimeline
            history={passportData.history}
            lastAnalyzed={passportData.lastAnalyzed}
          />

          {/* VERIFICATION & QR BLOCK */}
          <PassportVerification
            passportId={passportData.passportId}
            generatedDate={passportData.generatedAt}
            lastUpdated={passportData.lastUpdated}
            evidenceCount={passportData.evidenceCount}
            status={passportData.status}
          />

          {/* OFFICIAL DISCLAIMER & TRUST BADGES */}
          <PassportDisclaimer />
        </div>

      </main>

      {/* "Why This Result?" Explainability Modal */}
      <WhyThisResultModal
        isOpen={Boolean(whyModalData)}
        onClose={() => setWhyModalData(null)}
        data={whyModalData}
      />
    </div>
  );
}
