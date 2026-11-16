"""Additive, source-bound desktop vignette inventory."""
import hashlib,json

def validate_desktop_ui(root,image_info):
    path=root/'art/redesign/desktop-ui-manifest.json'
    if not path.exists():return set(),0
    m=json.loads(path.read_text());assert m['format']=='chenyuan-desktop-ui-inventory' and m['version']==1
    assert m['budgets']==dict(assets=1,maxRuntimeBytes=160000)
    assert m['rights']['productionUseApproved']is True and m['rights']['userAcceptance']is False and m['rights']['distributionLicense']is None
    for ref in m['sourceReferences']+m['rights']['evidenceReferences']:assert (root/ref).resolve().is_relative_to(root) and (root/ref).is_file()
    assert len(m['assets'])==1
    row=m['assets'][0];assert row['id']=='meditation-ink'
    source,runtime=row['source'],row['runtime'];assert source['path']=='art/redesign/desktop/meditation-ink-v1.png' and runtime['path']=='web/public/art/v2/ui/meditation-ink.webp'
    recorded=set()
    for item in [source,runtime]:
        file=(root/item['path']).resolve();assert file.is_relative_to(root) and file.is_file();data=file.read_bytes()
        assert len(data)==item['bytes'] and hashlib.sha256(data).hexdigest()==item['sha256']
        dims,alpha,fmt=image_info(data,file.suffix);assert dims==item['dimensions'] and alpha==item['alpha']is True and fmt==item['format'];recorded.add(item['path'])
    assert runtime['bytes']<=160000 and all(runtime['dimensions'][axis]<=source['dimensions'][axis]for axis in ['width','height'])
    assert m['bindingFile']=='web/src/assets.ts' and runtime['path'].removeprefix('web/public/')in(root/m['bindingFile']).read_text()
    ref=row['receipt'];assert ref['path']=='art/redesign/receipts/meditation-ink.json';data=(root/ref['path']).read_bytes();assert hashlib.sha256(data).hexdigest()==ref['sha256'];r=json.loads(data)
    assert r['id']==row['id'] and r['tool']=='built-in image_gen' and r['copiedUnchanged']is True and r['review']['actuallyViewed']is True
    assert r['sourceSHA256']==source['sha256']==row['reviewSourceHash'] and r['sourceDimensions']==source['dimensions'] and r['sourceBytes']==source['bytes'] and r['savedPath']==source['path'] and r['runtime']==runtime
    assert r['promptReference']=='art/redesign/receipts/desktop-ui-prompts.json#meditation-ink' and json.loads((root/r['promptReference'].split('#')[0]).read_text())['prompts']['meditation-ink']
    assert [x['path']for x in r['referenceImages']]==['art/redesign/characters/player-v1.png','art/redesign/scenes/cave-v1.png','goal-2/design/desktop-direction-v1.png']
    for x in r['referenceImages']:assert hashlib.sha256((root/x['path']).read_bytes()).hexdigest()==x['sha256']
    for field,item in [('alphaProof',source),('runtimeAlphaProof',runtime)]:
        a=r[field];assert a['min']==0 and 250<=a['max']<=255 and a['transparentPixels']>10000 and a['solidPixels']>10000 and a['intermediatePixels']>=0
        assert a['transparentPixels']+a['solidPixels']+a['intermediatePixels']==item['dimensions']['width']*item['dimensions']['height']
    assert r['encoding']==['cwebp','-q','82','-m','6','-alpha_q','100','-resize','512','0','-metadata','none']
    return recorded,2
