import { useTranslation } from "react-i18next";
import { Info, Tag, Package, MapPin, Globe, Compass, Activity } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { translatePassportData } from '../../lib/passportI18n';

export default function ProductProfileSection({
  product = {},
  className = ''
}) {
  const { t } = useTranslation();
  const notAvailable = t('productPassport.ui.notAvailable', 'Not available in current analysis');
  const name = product.name || notAvailable;
  const rawCategory = product.category || notAvailable;
  const category = translatePassportData(rawCategory, t);
  const dosage = product.dosageForm || product.dosage_form || notAvailable;
  const ingredients = Array.isArray(product.ingredients) && product.ingredients.length > 0 ? product.ingredients.join(', ') : product.ingredients || notAvailable;
  const botanicalNames = Array.isArray(product.botanicalNames) && product.botanicalNames.length > 0 ? product.botanicalNames.join(', ') : product.botanicalNames || t('productPassport.ui.taxonomicalPending', 'Taxonomical identification pending');
  const origin = product.ingredientOrigin || product.countryOfOrigin || product.source_region || notAvailable;
  const intendedUse = product.intendedUse || product.intended_use || notAvailable;
  const manufacturing = product.manufacturingMethod || product.manufacturing_process || notAvailable;
  const targetMarket = product.targetCountry || product.target_market || notAvailable;
  const classicalRef = product.classicalReference || notAvailable;
  return <section className={cn("bg-white border border-[#161412]/15 rounded-2xl p-6 sm:p-8 shadow-xs", className)}>
      <div className="flex items-center justify-between border-b border-[#161412]/10 pb-3 mb-6">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#176B45]">{t("productprofilesection.pRODUCTPROFILE", "PRODUCT PROFILE")}</h3>
          <p className="text-xs text-[#161412]/60 mt-0.5">{t("productprofilesection.verifiedformulationmetadataand", "Verified formulation metadata and physical specifications")}</p>
        </div>
        <span className="text-[10px] font-mono text-[#8C6D46] uppercase tracking-wider font-semibold">{t("productprofilesection.section01", "Section 01")}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
        {/* Product Name */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.productName", "Product Name")}</span>
          <span className="font-serif text-base font-bold text-[#161412] block">
            {name}
          </span>
        </div>

        {/* Product Category / Type */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.categoryClassification", "Category / Classification")}</span>
          <span className="font-medium text-[#161412] block">
            {category}
          </span>
        </div>

        {/* Dosage Form */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.dosageForm", "Dosage Form")}</span>
          <span className="font-medium text-[#161412] block">
            {dosage}
          </span>
        </div>

        {/* Origin */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.originSourcingRegion", "Origin / Sourcing Region")}</span>
          <span className="font-medium text-[#161412] block">
            {origin}
          </span>
        </div>

        {/* Key Ingredients */}
        <div className="sm:col-span-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.keyIngredients", "Key Ingredients")}</span>
          <p className="font-medium text-[#161412] leading-relaxed">
            {ingredients}
          </p>
        </div>

        {/* Botanical / Scientific Names */}
        <div className="sm:col-span-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.scientificBotanicalNames", "Scientific / Botanical Names")}</span>
          <p className="font-medium text-[#161412] italic leading-relaxed">
            {botanicalNames}
          </p>
        </div>

        {/* Manufacturing Method */}
        <div className="sm:col-span-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.manufacturingMethod", "Manufacturing Method")}</span>
          <p className="font-medium text-[#161412] leading-relaxed">
            {manufacturing}
          </p>
        </div>

        {/* Classical Reference */}
        <div className="sm:col-span-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.traditionalClassicalReference", "Traditional / Classical Reference")}</span>
          <span className="inline-block px-2.5 py-1 bg-[#176B45]/10 text-[#176B45] border border-[#176B45]/20 rounded font-serif font-medium text-xs">
            {classicalRef}
          </span>
        </div>

        {/* Intended Use */}
        <div className="sm:col-span-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.intendedUse", "Intended Use")}</span>
          <p className="font-medium text-[#161412] leading-relaxed">
            {intendedUse}
          </p>
        </div>

        {/* Target Market */}
        <div className="sm:col-span-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C6D46] block mb-1">{t("productprofilesection.targetMarket", "Target Market")}</span>
          <span className="font-medium text-[#176B45]">
            {targetMarket}
          </span>
        </div>
      </div>
    </section>;
}