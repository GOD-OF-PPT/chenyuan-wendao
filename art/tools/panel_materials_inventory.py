"""Additive paper/ink ledger; historical UI budgets remain intact."""
import hashlib
import json


def validate_panel_materials(root, image_info):
    path = root / 'art/redesign/panel-materials.json'
    if not path.exists():
        assert not (root / 'web/src/panel-materials.css').exists(), 'Unrecorded panel materials'
        return set(), 0
    m = json.loads(path.read_text())
    assert m['format'] == 'chenyuan-panel-materials' and m['version'] == 1
    assert m['budgets'] == dict(assets=2, maxRuntimeBytes=160000, maxStyleBytes=6500)
    assert m['rights'] == dict(productionUseApproved=True, distributionLicense=None, userAcceptance=False)
    assert [a['id'] for a in m['assets']] == ['xuan-paper', 'mountain-wash']
    assert m['bindingFiles'] == ['web/src/panel-materials.css', 'web/src/assets.ts', 'web/src/App.vue']
    for ref in m['sourceReferences'] + m['bindingFiles']:
        file = (root / ref).resolve()
        assert file.is_relative_to(root) and file.is_file()
    style = m['style']
    assert style['path'] == 'web/src/panel-materials.css'
    data = (root / style['path']).read_bytes()
    assert len(data) == style['bytes'] <= 6500 and hashlib.sha256(data).hexdigest() == style['sha256']
    assert m['consumer'] == 'web/src/main.ts' and "import './panel-materials.css'" in (root / m['consumer']).read_text()
    recorded, total = set(), 0
    assert len(m['retainedInputs']) == 1
    prior = m['retainedInputs'][0]
    assert prior['id'] == 'xuan-paper'
    for field, expected in [('source', 'art/redesign/desktop/xuan-paper-v1.png'), ('runtime', 'web/public/art/v2/ui/xuan-paper-v1.webp')]:
        item = prior[field]
        assert item['path'] == expected
        data = (root / item['path']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == item['sha256'] and len(data) == item['bytes']
        dims, alpha, fmt = image_info(data, (root / item['path']).suffix)
        assert dims == item['dimensions'] and alpha is item['alpha'] is False and fmt == item['format']
        recorded.add(item['path'])
    data = (root / prior['receipt']['path']).read_bytes()
    assert hashlib.sha256(data).hexdigest() == prior['receipt']['sha256']
    previous_receipt = json.loads(data)
    assert previous_receipt['source'] == prior['source'] and previous_receipt['runtime'] == prior['runtime']
    reference = previous_receipt['referenceImages'][0]
    assert reference['path'] == 'goal-2/design/desktop-direction-v1.png'
    assert hashlib.sha256((root / reference['path']).read_bytes()).hexdigest() == reference['sha256']
    for row in m['assets']:
        key = row['id']
        source, runtime = row['source'], row['runtime']
        version = 2 if key == 'xuan-paper' else 1
        assert source['path'] == f'art/redesign/desktop/{key}-v{version}.png'
        assert runtime['path'] == f'web/public/art/v2/ui/{key}-v{version}.webp'
        for item in [source, runtime]:
            file = root / item['path']
            data = file.read_bytes()
            assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256']
            dims, alpha, fmt = image_info(data, file.suffix)
            assert dims == item['dimensions'] and alpha == item['alpha'] == (key == 'mountain-wash') and fmt == item['format']
            recorded.add(item['path'])
        assert all(0 < runtime['dimensions'][axis] <= source['dimensions'][axis] for axis in ['width', 'height'])
        total += runtime['bytes']
        binding = (root / ('web/src/assets.ts' if key == 'mountain-wash' else style['path'])).read_text()
        assert runtime['path'].removeprefix('web/public/') in binding
        assert 'PANEL_MATERIAL_ASSETS.mountains' in (root / 'web/src/App.vue').read_text()
        ref = row['receipt']
        assert ref['path'] == f'art/redesign/receipts/{key}-v{version}.json'
        data = (root / ref['path']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == ref['sha256']
        r = json.loads(data)
        assert r['id'] == key and r['tool'] == 'built-in image_gen' and r['copiedUnchanged'] is True and r['review']['actuallyViewed'] is True
        assert r['source'] == source and r['runtime'] == runtime and row['reviewSourceHash'] == source['sha256']
        assert r['savedPath'] == source['path']
        prompt_file = 'panel-paper-v2-prompt' if key == 'xuan-paper' else 'panel-material-prompts'
        assert r['promptReference'] == f'art/redesign/receipts/{prompt_file}.json#{key}'
        assert json.loads((root / r['promptReference'].split('#')[0]).read_text())['prompts'][key]
        assert len(r['referenceImages']) == 1
        image = r['referenceImages'][0]
        assert image['path'] == (prior['source']['path'] if key == 'xuan-paper' else 'goal-2/design/desktop-direction-v1.png')
        assert hashlib.sha256((root / image['path']).read_bytes()).hexdigest() == image['sha256']
        assert r['request']['transparent_background'] == (key == 'mountain-wash')
        for name, item in [('alphaProof', source), ('runtimeAlphaProof', runtime)]:
            a = r[name]
            assert a['transparentPixels'] + a['solidPixels'] + a['intermediatePixels'] == item['dimensions']['width'] * item['dimensions']['height']
            if key == 'mountain-wash':
                assert a['min'] == 0 and a['max'] >= 250 and a['transparentPixels'] > 10000 and a['solidPixels'] > 10000
            else:
                assert a['min'] == a['max'] == 255 and a['transparentPixels'] == a['intermediatePixels'] == 0
        assert r['encoding'] == ['cwebp', '-q', '78' if key == 'xuan-paper' else '82', '-m', '6'] + (['-alpha_q', '100'] if key == 'mountain-wash' else []) + ['-resize', '512' if key == 'xuan-paper' else '768', '0', '-metadata', 'none']
    assert total <= 160000
    return recorded, 4
