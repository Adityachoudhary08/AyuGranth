import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { productsApi } from '../api'

const emptyForm = {
  name: '',
  intended_use: '',
  source_region: 'India',
  target_market: '',
  dosage_form: 'Tablet/Capsule',
  manufacturing_process: '',
  uses_only_classical_texts: false,
  region_specific: false,
  unique_packaging: false,
  new_plant_variety_bred: false,
}

function passportId(productId) {
  return `IPS-2026-${String(productId).slice(-6).toUpperCase()}`
}

export default function Passports() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [ingredientQuery, setIngredientQuery] = useState('')
  const [ingredientSuggestions, setIngredientSuggestions] = useState([])
  const [duplicate, setDuplicate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const loadedProducts = await productsApi.listProducts()
      setProducts(Array.isArray(loadedProducts) ? loadedProducts : [])
    } catch (loadError) {
      setError(t('passports.errorLoad'))
    } finally {
      setLoading(false)
      setHasLoadedProducts(true)
    }
  }

  useEffect(() => {
    loadProducts()
    productsApi.listIngredientReferences().then(setIngredientSuggestions).catch(() => {})
  }, [])

  const updateForm = (event) => {
    const nextForm = { ...form, [event.target.name]: event.target.value }
    setForm(nextForm)
    if (event.target.name === 'name' || event.target.name === 'ingredients') {
      setDuplicate(null)
    }
  }

  const searchIngredients = async (event) => {
    const query = event.target.value
    setIngredientQuery(query)
    try {
      setIngredientSuggestions(await productsApi.listIngredientReferences(query))
    } catch (searchError) {
      setIngredientSuggestions([])
    }
  }

  const addIngredient = (ingredient) => {
    if (!selectedIngredients.some((item) => item.name === ingredient.name)) {
      setSelectedIngredients((current) => [...current, ingredient])
    }
    setIngredientQuery('')
  }

  const removeIngredient = (name) => {
    setSelectedIngredients((current) => current.filter((item) => item.name !== name))
  }

  const getIngredientNames = () => {
    if (selectedIngredients.length > 0) {
      return selectedIngredients.map((item) => item.name)
    }
    return ingredientQuery
      .split(/,|\band\b/i)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  const checkDuplicate = async () => {
    const result = await productsApi.checkDuplicate({
      name: form.name.trim(),
      ingredients: getIngredientNames(),
    })
    setDuplicate(result?.possible_duplicate || null)
    return result?.possible_duplicate || null
  }

  const createPassport = async (event, forceCreate = false) => {
    event?.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (!forceCreate) {
        const possibleDuplicate = await checkDuplicate()
        if (possibleDuplicate) {
          setSaving(false)
          return
        }
      }

      const product = await productsApi.createProduct({
        ...form,
        ingredients: getIngredientNames(),
      })
      navigate(`/product-passport/${product._id}`)
    } catch (createError) {
      if (createError.response?.status === 409) {
        setError(t('passports.errorDuplicate'))
      } else {
        setError(t('passports.errorCreate'))
      }
    } finally {
      setSaving(false)
    }
  }

  const deletePassport = async (product) => {
    const confirmed = window.confirm(t('passports.deleteConfirm'))
    if (!confirmed) return

    try {
      await productsApi.deleteProduct(product._id)
      setProducts((current) => current.filter((item) => item._id !== product._id))
    } catch (deleteError) {
      setError(t('passports.errorDelete'))
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#161412] font-sans pb-24">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 space-y-10">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 border-b border-[#161412]/10 pb-7">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[#176B45]">{t('passports.pageMono')}</p>
            <h1 className="font-serif text-4xl mt-2">{t('passports.pageTitle')}</h1>
            <p className="text-sm text-[#161412]/65 mt-2 max-w-xl">{t('passports.pageSubtitle')}</p>
          </div>
          <a href="#new-passport" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#176B45] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#125537] transition-colors">
            <Plus className="w-4 h-4" /> {t('passports.newBtn')}
          </a>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] gap-8 items-start">
        <section className="lg:col-start-2 lg:row-start-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#176B45]">{t('passports.archiveMono')}</p>
              <h2 className="font-serif text-2xl mt-1">{t('passports.archiveHeading')}</h2>
            </div>
            <span className="text-xs font-mono text-[#161412]/50">{products.length} {t('passports.records')}</span>
          </div>
          {loading && !hasLoadedProducts ? (
            <div className="bg-white border border-[#161412]/10 rounded-2xl p-8 text-sm text-[#161412]/60">{t('passports.loading')}</div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-[#161412]/10 rounded-2xl p-8 text-sm text-[#161412]/60">{t('passports.empty')}</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 pr-1">
              {products.map((product) => (
                <div key={product._id} className="group snap-start shrink-0 w-[min(82vw,300px)] bg-white border border-[#161412]/10 rounded-2xl p-5 hover:border-[#176B45]/50 hover:shadow-sm transition-all">
                  <Link to={`/product-passport/${product._id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl leading-tight">{product.name}</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {t('passports.needsReview')}</span>
                  </div>
                  <p className="text-xs text-[#176B45] mt-3">{product.dosage_form || t('passports.ayurvedicFormulation')}</p>
                  <p className="text-xs text-[#161412]/60 mt-2 line-clamp-2">{product.ingredients?.join(', ') || t('passports.ingredientsNotRecorded')}</p>
                  <div className="flex items-center justify-between mt-6 pt-3 border-t border-[#161412]/10 text-[10px] font-mono text-[#161412]/50">
                    <span>{passportId(product._id)}</span>
                    <span>{product.created_at ? new Date(product.created_at).toLocaleDateString() : t('passports.notAnalyzed')}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-[#176B45] group-hover:gap-2 transition-all">{t('passports.openPassport')} <ArrowRight className="w-3.5 h-3.5" /></div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => deletePassport(product)}
                    className="inline-flex items-center gap-1.5 mt-4 pt-3 border-t border-[#161412]/10 text-[11px] font-semibold text-red-700 hover:text-red-900"
                    aria-label={`${t('passports.deletePermanently')} ${product.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('passports.deletePermanently')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="new-passport" className="lg:col-start-1 lg:row-start-1 bg-white border border-[#161412]/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#176B45]/10 text-[#176B45] flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
            <div><h2 className="font-serif text-2xl">{t('passports.formHeading')}</h2><p className="text-xs text-[#161412]/60 mt-1">{t('passports.formSubtitle')}</p></div>
          </div>
          <form onSubmit={createPassport} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="text-sm font-medium">{t('passports.field1Label')} *<input required name="name" value={form.name} onChange={updateForm} className="mt-1.5 w-full bg-[#f8f7f4] border border-[#161412]/15 rounded-lg px-3 py-2.5 font-normal focus:outline-none focus:border-[#176B45]" placeholder={t('passports.field1Placeholder')} /></label>
            <div className="text-sm font-medium md:col-span-2 relative">{t('passports.field2Label')} *
              <input value={ingredientQuery} onChange={searchIngredients} className="mt-1.5 w-full bg-[#f8f7f4] border border-[#161412]/15 rounded-lg px-3 py-2.5 font-normal focus:outline-none focus:border-[#176B45]" placeholder={t('passports.field2Placeholder')} />
              {ingredientQuery && ingredientSuggestions.length > 0 && <div className="absolute left-0 right-0 top-18 z-20 bg-white border border-[#161412]/15 rounded-xl shadow-lg overflow-hidden">{ingredientSuggestions.map((ingredient) => <button type="button" key={ingredient._id || ingredient.name} onClick={() => addIngredient(ingredient)} className="w-full text-left px-3 py-2.5 hover:bg-[#FAF8F3] text-xs flex items-center justify-between"><span><strong>{ingredient.name}</strong>{ingredient.botanical_name && <span className="text-[#161412]/50"> · {ingredient.botanical_name}</span>}</span>{ingredient.is_mineral_metallic && <span className="text-[10px] text-amber-800">{t('badges.mineralMetallic')}</span>}</button>)}</div>}
              <div className="flex flex-wrap gap-2 mt-2">{selectedIngredients.map((ingredient) => <span key={ingredient.name} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#176B45]/10 text-[#176B45] text-xs">{ingredient.name}{ingredient.is_mineral_metallic && <span className="text-amber-700">{t('badges.mineral')}</span>}<button type="button" onClick={() => removeIngredient(ingredient.name)} className="font-bold" aria-label={`Remove ${ingredient.name}`}>×</button></span>)}</div>
              {selectedIngredients.length === 0 && <p className="text-[11px] text-[#161412]/50 mt-2">{t('passports.ingredientHint')}</p>}
            </div>
            <label className="text-sm font-medium md:col-span-2">{t('passports.field3Label')}<input required name="intended_use" value={form.intended_use} onChange={updateForm} className="mt-1.5 w-full bg-[#f8f7f4] border border-[#161412]/15 rounded-lg px-3 py-2.5 font-normal focus:outline-none focus:border-[#176B45]" placeholder={t('passports.field3Placeholder')} /></label>
            <label className="text-sm font-medium">{t('passports.field4Label')}<input name="source_region" value={form.source_region} onChange={updateForm} className="mt-1.5 w-full bg-[#f8f7f4] border border-[#161412]/15 rounded-lg px-3 py-2.5 font-normal focus:outline-none focus:border-[#176B45]" /></label>
            <label className="text-sm font-medium">{t('passports.field5Label')}<input name="target_market" value={form.target_market} onChange={updateForm} className="mt-1.5 w-full bg-[#f8f7f4] border border-[#161412]/15 rounded-lg px-3 py-2.5 font-normal focus:outline-none focus:border-[#176B45]" placeholder={t('passports.field5Placeholder')} /></label>
            <details className="md:col-span-2 border-t border-[#161412]/10 pt-5">
              <summary className="cursor-pointer text-sm font-semibold text-[#176B45]">{t('passports.additionalDetails')}</summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <label className="text-sm font-medium md:col-span-2">{t('passports.mfgMethodLabel')} <span className="font-normal text-[#161412]/50">{t('passports.optional')}</span><input name="manufacturing_process" value={form.manufacturing_process} onChange={updateForm} className="mt-1.5 w-full bg-[#f8f7f4] border border-[#161412]/15 rounded-lg px-3 py-2.5 font-normal focus:outline-none focus:border-[#176B45]" placeholder={t('passports.mfgMethodPlaceholder')} /></label>
                <label className="flex items-start gap-3 text-sm font-medium md:col-span-2"><input type="checkbox" name="uses_only_classical_texts" checked={form.uses_only_classical_texts} onChange={(event) => setForm((current) => ({ ...current, uses_only_classical_texts: event.target.checked }))} className="mt-1 accent-[#176B45]" />{t('passports.classicalTextCheck')}</label>
                <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="region_specific" checked={form.region_specific} onChange={(event) => setForm((current) => ({ ...current, region_specific: event.target.checked }))} className="mt-1 accent-[#176B45]" />{t('passports.regionalCheck')}</label>
                <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="unique_packaging" checked={form.unique_packaging} onChange={(event) => setForm((current) => ({ ...current, unique_packaging: event.target.checked }))} className="mt-1 accent-[#176B45]" />{t('passports.packagingCheck')}</label>
                <label className="flex items-start gap-3 text-sm md:col-span-2"><input type="checkbox" name="new_plant_variety_bred" checked={form.new_plant_variety_bred} onChange={(event) => setForm((current) => ({ ...current, new_plant_variety_bred: event.target.checked }))} className="mt-1 accent-[#176B45]" />{t('passports.plantVarietyCheck')}</label>
              </div>
            </details>
            {duplicate && (
              <div className="md:col-span-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div><strong>{t('passports.duplicateTitle', { name: duplicate.name })}</strong><p className="mt-1 text-xs">{t('passports.duplicateId', { id: passportId(duplicate._id), date: duplicate.created_at ? new Date(duplicate.created_at).toLocaleDateString() : t('passports.duplicateDateUnavailable') })}</p><div className="flex flex-wrap gap-3 mt-3"><button type="button" onClick={() => navigate(`/product-passport/${duplicate._id}`)} className="text-xs font-bold text-[#176B45] underline">{t('passports.viewExisting')}</button><button type="button" onClick={(event) => createPassport(event, true)} className="text-xs font-bold text-amber-900 underline">{t('passports.createAnyway')}</button></div></div>
              </div>
            )}
            <div className="md:col-span-2"><button type="submit" disabled={saving || !form.name.trim() || getIngredientNames().length === 0} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#176B45] text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#125537] transition-colors">{saving ? t('passports.checkingBtn') : t('passports.createBtn')} <ArrowRight className="w-4 h-4" /></button></div>
          </form>
        </section>
        </div>
      </main>
    </div>
  )
}
