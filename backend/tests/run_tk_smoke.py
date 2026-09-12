import importlib.util
import os
import sys
import types

fake = types.ModuleType('services.similarity_engine')
async def search_similar_chunks(*args, **kwargs):
    return []
fake.search_similar_chunks = search_similar_chunks
sys.modules['services.similarity_engine'] = fake
path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'services', 'tk_prior_art.py')
spec = importlib.util.spec_from_file_location('services.tk_prior_art', path)
mod = importlib.util.module_from_spec(spec)
sys.modules['services.tk_prior_art'] = mod
spec.loader.exec_module(mod)
raw = ('A traditional Ayurvedic formulation comprising Curcuma longa rhizome and Zingiber officinale rhizome '
       'in equal proportions, traditionally used for management of inflammatory conditions and digestive discomfort. '
       'The formulation is prepared as a simple powdered herbal mixture without any novel extraction method, '
       'encapsulation technology, nanoparticle system, or synthetic modification.')
p = mod.parse_exact_input(raw)
assert p['ingredients'] == ['Curcuma longa rhizome', 'Zingiber officinale rhizome']
assert p['proportions'] in (['equal proportions'], ['in equal proportions'])
assert p['delivery_technology'] == mod.NOT_SPECIFIED
assert p['synthetic_modification'].lower().startswith('without') or p['synthetic_modification'].lower().startswith('no'), p['synthetic_modification']
evidence = mod.normalize_evidence([
    {'source_type':'classical_text','source_document':'Curcuma source','chunk_id':'1','chunk_text':'Curcuma longa is documented.','semantic_similarity':.8},
    {'source_type':'classical_text','source_document':'Zingiber source','chunk_id':'2','chunk_text':'Zingiber officinale is documented.','semantic_similarity':.8},
])
assert all(x['source_type'] == 'classical_tk' for x in evidence)
m = mod.match_features(p, evidence)
assert next(x for x in m if x['feature'] == 'Combination')['status'] == 'NOT_FOUND'
r = mod.build_response(raw, p, evidence, m)
assert r['overlap_level'] == 'PARTIAL'
print('TK_SMOKE_PASS')
