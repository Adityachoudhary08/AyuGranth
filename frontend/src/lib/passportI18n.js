/**
 * Helper to translate static product passport status, finding, and requirement strings
 * across all supported languages while preserving dynamic technical/legal values.
 */

const STATUS_KEY_MAP = {
  'needs review': 'productPassport.status.needsReview',
  'evidence reviewed': 'productPassport.status.evidenceReviewed',
  'further review recommended': 'productPassport.status.furtherReviewRecommended',
  'potential prior-art overlap identified': 'productPassport.status.priorArtOverlapIdentified',
  'prior-art overlap identified': 'productPassport.status.priorArtOverlapIdentified',
  'documentation required': 'productPassport.status.documentationRequired',
  'documentation required for us fda route': 'productPassport.status.documentationRequiredForUSFDARoute',
  'abs obligations apply': 'productPassport.status.absObligationsApply',
  'screening not triggered': 'productPassport.status.screeningNotTriggered',
  'in progress': 'productPassport.status.inProgress',
  'statutory requirement': 'productPassport.status.statutoryRequirement',
  'statutory obligation': 'productPassport.status.statutoryObligation',
  'statutory exclusion guideline': 'productPassport.status.statutoryExclusionGuideline',
  'federal regulation': 'productPassport.status.federalRegulation',
  'indexed': 'productPassport.status.indexed',
  'high': 'productPassport.status.high',
  'critical': 'productPassport.status.high',
  'medium': 'productPassport.status.medium',
  'moderate': 'productPassport.status.moderate',
  'strong': 'productPassport.status.strong',
  'low': 'productPassport.status.low',
};

const DATA_KEY_MAP = {
  'proprietary ayurvedic medicine': 'productPassport.data.proprietaryAyurvedicMedicine',
  'drugs & cosmetics act (rule 158-b / form 25-d)': 'productPassport.data.drugsAndCosmeticsPathway',
  'product classification requires further regulatory assessment under the drugs & cosmetics act for export.': 'productPassport.data.regSummary',
  'manufacturing under licensed ayush gmp facility (schedule t)': 'productPassport.data.reqAyushGmp',
  'substantiation of ingredients with classical textual citations or safety data': 'productPassport.data.reqSubstantiation',
  'heavy metals (lead, arsenic, cadmium, mercury) test reports within pharmacopoeial limits': 'productPassport.data.reqHeavyMetals',
  'batch release testing and stability assessment data': 'productPassport.data.reqBatchRelease',
  'permissible traditional indications allowed under ayush licensure. avoid allopathic disease prevention or cure claims.': 'productPassport.data.claimsConsideration',
  'stability study dossier pending completion for extended shelf life claims': 'productPassport.data.openIssueStability',
  'batch analysis report required from nabl-accredited laboratory': 'productPassport.data.openIssueBatchAnalysis',
  'potential section 3(p) & 3(d) overlap — further review recommended': 'productPassport.data.ipPosture',
  'traditional knowledge overlap identified; comparative synergistic efficacy data required under section 3(p).': 'productPassport.data.ipSummary',
  'under section 3(p) of the indian patents act, 1970, formulations derived from known ayurvedic properties face inherent novelty objections. demonstrating non-obvious synergistic therapeutic efficacy under section 3(d) is required with comparative experimental data.': 'productPassport.data.ipReasoning',
  'section 3(p) statutory objection regarding aggregation of known traditional ayurvedic properties': 'productPassport.data.ipRisk3p',
  'section 3(d) requirement to demonstrate enhanced therapeutic efficacy over standard extracts': 'productPassport.data.ipRisk3d',
  'mandatory prior approval from national biodiversity authority (nba) under section 6 of biological diversity act 2002 before patent grant': 'productPassport.data.ipRiskNba',
  'verify that the brand name does not infringe existing classical ayurvedic generic terms or registered class 5 pharmaceutical marks.': 'productPassport.data.trademarkConsiderations',
  'product utilizes biological resources originating from india. entities accessing indian bio-resources for commercial utilization or patenting must comply with section 3, 4, and 6 of the biological diversity act, 2002.': 'productPassport.data.absSummary',
  'obtain prior approval from national biodiversity authority (nba) via form i for commercial utilization': 'productPassport.data.absObligationNba',
  'mandatory disclosure of biological resource geographical origin in patent filings (section 6)': 'productPassport.data.absObligationDisclosure',
  'ensure prior informed consent (pic) and fair and equitable benefit-sharing compliance': 'productPassport.data.absObligationPic',
  'botanical active ingredients have documented classical therapeutic indications in foundational ayurvedic treatises.': 'productPassport.data.tkSummary',
  'export to the united states operates under the dietary supplement health and education act (dshea 1994). products are classified as dietary supplements and must comply with 21 cfr part 111 cgmp regulations.': 'productPassport.data.intlSummary',
  'us fda food & dietary supplement facility registration (21 cfr part 1)': 'productPassport.data.intlReqFacility',
  'manufacturing under 21 cfr part 111 (dietary supplement cgmp)': 'productPassport.data.intlReqCgmp',
  'structure/function claim substantiation dossier with mandatory fda disclaimer': 'productPassport.data.intlReqClaims',
  'usp <2232> heavy metals compliance (lead < 0.5 mcg/day, arsenic, cadmium, mercury)': 'productPassport.data.intlReqUsp',
  'pre-market new dietary ingredient (ndi) notification if botanical was not marketed in us pre-1994': 'productPassport.data.intlReqNdi',
  'quality certifications (who-gmp, iso 22000, ayush premium mark)': 'productPassport.data.intlGapQuality',
  'botanical taxonomical verification (voucher specimen number)': 'productPassport.data.intlGapTaxonomy',
  'heavy metal and microbial laboratory test reports': 'productPassport.data.intlGapLab',
  'substantiate synergistic efficacy (section 3(p) / 3(d))': 'productPassport.data.act1Title',
  'because the formulation contains known classical botanical constituents, the indian patent office requires comparative experimental synergy data (e.g. combination index < 1) to overcome traditional knowledge objections.': 'productPassport.data.act1Reason',
  'file nba form i for access & benefit-sharing clearance': 'productPassport.data.act2Title',
  'commercial utilization or patent filing for biological resources accessed from india requires mandatory prior approval from the national biodiversity authority under section 3 & 6 of the biological diversity act, 2002.': 'productPassport.data.act2Reason',
  'compile us fda 21 cfr 111 cgmp & heavy metals testing dossier': 'productPassport.data.act3Title',
  'destination export into the united states mandates usp <2232> contaminant threshold compliance and formulation structure/function claim notification within 30 days of marketing.': 'productPassport.data.act3Reason',
  'product passport synthesized & evidence indexed': 'productPassport.data.hist1Event',
  'full cross-module analysis (regulatory, ip, biodiversity, international)': 'productPassport.data.hist1Detail',
  'regulatory classification pathway verified': 'productPassport.data.hist2Event',
  'drugs and cosmetics rules schedule t compliance flagged': 'productPassport.data.hist2Detail',
};

export function translatePassportStatus(status, t) {
  if (!status || typeof status !== 'string') return status;
  const key = STATUS_KEY_MAP[status.trim().toLowerCase()];
  return key && t ? t(key, status) : status;
}

export function translatePassportData(text, t) {
  if (!text || typeof text !== 'string') return text;
  const key = DATA_KEY_MAP[text.trim().toLowerCase()] || STATUS_KEY_MAP[text.trim().toLowerCase()];
  return key && t ? t(key, text) : text;
}
