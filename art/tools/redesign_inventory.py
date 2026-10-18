"""Strict additive scene ledger. Legacy inventory and its finite budget stay independently checked."""
from pathlib import Path
import hashlib, json

SCENE_IDS = {'opening', 'wilderness', 'cave', 'sect', 'market', 'secret', 'terrace'}

def validate_redesign(root, image_info):
    path = root / 'art/redesign/manifest.json'
    if not path.exists():
        return set(), 0, 0
    m = json.loads(path.read_text())
    assert m['format'] == 'chenyuan-redesign-scene-inventory' and m['version'] == 1
    assert len(m['activeSceneIds']) == 7 and set(m['activeSceneIds']) == SCENE_IDS
    assert m['budgets'] == {'sceneMasters':7,'stageVariants':2,'maxSceneBytes':500000}
    assert m['rights']['productionUseApproved'] is True and m['rights']['userAcceptance'] is False
    assert m['rights']['distributionLicense'] is None
    for ref in m['sourceReferences'] + m['rights']['evidenceReferences']:
        assert (root/ref).is_file(), 'Missing redesign source reference: '+ref
    binding = (root/m['bindingFile']).read_text()
    recorded, ids, sources, runtime_paths = set(), set(), set(), set()

    def file_fact(f):
        filename = (root/f['path']).resolve()
        assert filename.is_relative_to(root) and filename.is_file(), 'Missing/external redesign file'
        assert f['path'] not in recorded, 'Duplicate redesign path'
        data = filename.read_bytes()
        assert len(data) == f['bytes'] and hashlib.sha256(data).hexdigest() == f['sha256'], 'Redesign file hash/bytes mismatch'
        dimensions, alpha, fmt = image_info(data, filename.suffix)
        assert f['dimensions'] == dimensions and f['alpha'] == alpha and f['format'] == fmt, 'Redesign image header mismatch'
        recorded.add(f['path'])
        return data

    def receipt_for(descriptor):
        data = (root/descriptor['path']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == descriptor['sha256'], 'Redesign receipt hash mismatch'
        receipt = json.loads(data)
        assert receipt['tool'] == 'built-in image_gen' and receipt['copiedUnchanged'] is True
        assert receipt['review']['actuallyViewed'] is True
        prompt_path, key = receipt['promptReference'].split('#')
        assert json.loads((root/prompt_path).read_text())['prompts'][key]
        for ref in receipt['referenceImages']:
            p = (root/ref['path']).resolve()
            assert p.is_relative_to(root) and p.is_file()
            assert hashlib.sha256(p.read_bytes()).hexdigest() == ref['sha256'], 'Redesign reference hash mismatch'
        return receipt

    assert len(m['scenes']) == 7
    for scene in m['scenes']:
        key, source, runtime = scene['id'], scene['source'], scene['runtime']
        assert key in SCENE_IDS and key not in ids
        ids.add(key)
        assert source['path'].startswith('art/redesign/scenes/') and source['format'] == 'png'
        assert runtime['path'] == 'web/public/art/v2/scenes/'+key+'.webp' and runtime['format'] == 'webp'
        assert source['sha256'] not in sources and runtime['path'] not in runtime_paths, 'Scenes must be distinct files'
        sources.add(source['sha256']);runtime_paths.add(runtime['path'])
        file_fact(source);file_fact(runtime)
        assert runtime['bytes'] <= m['budgets']['maxSceneBytes']
        assert runtime['dimensions']['width'] <= source['dimensions']['width'] and runtime['dimensions']['height'] <= source['dimensions']['height'], 'Upscaled scene'
        assert runtime['alpha'] == source['alpha']
        assert runtime['path'].removeprefix('web/public/') in binding, 'Scene not declared by runtime binding'
        receipt = receipt_for(scene['receipt'])
        assert receipt['savedPath'] == source['path'] and receipt['sourceSHA256'] == source['sha256'] and receipt['sourceDimensions'] == source['dimensions']
        assert receipt['runtime'] == runtime and receipt['encoding'][:4] == ['cwebp','-q','84','-m']
        assert scene['reviewSourceHash'] == source['sha256']
    assert ids == SCENE_IDS
    assert len(m['stageVariants'])==2 and {v['gate']for v in m['stageVariants']}=={'storm','opened'}
    parent=next(s for s in m['scenes']if s['id']=='terrace')['source']
    for variant in m['stageVariants']:
        source,runtime=variant['source'],variant['runtime']
        file_fact(source);file_fact(runtime)
        assert runtime['path']=='web/public/art/v2/scenes/terrace-'+variant['gate']+'.webp'
        assert runtime['bytes']<=500000 and runtime['dimensions']['width']<=source['dimensions']['width']
        assert source['dimensions']==parent['dimensions'] and runtime['alpha']==source['alpha']
        assert variant['sourceParentSHA256']==parent['sha256']
        assert runtime['path'].removeprefix('web/public/')in binding
        receipt=receipt_for(variant['receipt'])
        assert receipt['sourceSHA256']==source['sha256'] and receipt['savedPath']==source['path'] and receipt['runtime']==runtime
        assert receipt['referenceImages']==[{'path':parent['path'],'role':'edit target; preserve architecture/composition, change only door state or weather','sha256':parent['sha256']}]
    assert len(m['inputs']) == 1
    for item in m['inputs']:
        assert item['path'] == 'art/redesign/scenes/terrace-v1.png' and 'never a runtime' in item['role']
        file_fact(item)
        original = json.loads((root/item['receipt']).read_text())
        assert original['tool'] == 'built-in image_gen' and original['sourceSHA256'] == item['sha256']
    return recorded, (len(m['scenes'])+len(m['stageVariants']))*2, len(m['inputs'])
