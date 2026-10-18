"""Additive character/enemy ledger; old artwork and its budgets remain intact."""
import hashlib,json

CHARACTERS={'player','shen','lu','pei','yan'}
ENEMIES={'wolf','warden','serpent','puppet','shadow','sentinel','trial_heart','trial_thunder','trial_gate'}

def validate_character_battle(root,image_info):
    manifest=root/'art/redesign/character-battle-manifest.json'
    if not manifest.exists():
        return set(),0
    m=json.loads(manifest.read_text())
    assert m['format']=='chenyuan-character-battle-inventory' and m['version']==2
    assert m['budgets']==dict(characters=5,enemies=9,maxCharacterBytes=80000,maxEnemyBytes=120000,presentationVariants=1,maxPresentationBytes=500000)
    assert len(m['activeCharacterIds'])==5 and set(m['activeCharacterIds'])==CHARACTERS
    assert len(m['activeEnemyIds'])==9 and set(m['activeEnemyIds'])==ENEMIES
    assert m['rights']['productionUseApproved']is True and m['rights']['userAcceptance']is False and m['rights']['distributionLicense']is None
    for ref in m['sourceReferences']+m['rights']['evidenceReferences']:
        assert (root/ref).resolve().is_relative_to(root) and (root/ref).is_file()
    binding=(root/m['bindingFile']).read_text()
    recorded,hashes=set(),set()
    def fact(f,expected_alpha=True):
        path=(root/f['path']).resolve()
        assert path.is_relative_to(root) and path.is_file()
        assert f['path']not in recorded,'Duplicate character/enemy file'
        data=path.read_bytes()
        assert len(data)==f['bytes'] and hashlib.sha256(data).hexdigest()==f['sha256'],'Character/enemy hash/bytes mismatch'
        dims,alpha,fmt=image_info(data,path.suffix)
        assert dims==f['dimensions'] and alpha==f['alpha']is expected_alpha and fmt==f['format'],'Character/enemy alpha/header mismatch'
        recorded.add(f['path'])
    for category,ids,maximum,prompt_key in [('characters',CHARACTERS,80000,'character'),('enemies',ENEMIES,120000,'enemy')]:
        rows=m[category]
        assert len(rows)==len(ids) and {row['id']for row in rows}==ids
        for row in rows:
            key,source,runtime=row['id'],row['source'],row['runtime']
            assert source['path']=='art/redesign/'+category+'/'+key+'-v1.png'
            assert runtime['path']=='web/public/art/v2/'+category+'/'+key+'.webp'
            assert source['sha256']not in hashes,'Different subjects cannot share one original'
            hashes.add(source['sha256']);fact(source);fact(runtime)
            assert runtime['bytes']<=maximum
            assert all(runtime['dimensions'][d]<=source['dimensions'][d]for d in ['width','height']),'Upscaled character/enemy'
            assert runtime['path'].removeprefix('web/public/')in binding,'Unbound character/enemy image'
            descriptor=row['receipt'];path=(root/descriptor['path']).resolve()
            assert path.is_relative_to(root) and path.is_file()
            data=path.read_bytes();assert hashlib.sha256(data).hexdigest()==descriptor['sha256']
            receipt=json.loads(data)
            assert receipt['id']==key and receipt['category']==category
            assert receipt['tool']=='built-in image_gen' and receipt['copiedUnchanged']is True and receipt['review']['actuallyViewed']is True
            assert receipt['savedPath']==source['path'] and receipt['sourceSHA256']==source['sha256'] and receipt['sourceDimensions']==source['dimensions'] and receipt['sourceBytes']==source['bytes']
            assert receipt['runtime']==runtime and row['reviewSourceHash']==source['sha256']
            assert receipt['promptReference']=='art/redesign/receipts/'+prompt_key+'-prompts.json#'+key
            assert json.loads((root/receipt['promptReference'].split('#')[0]).read_text())['prompts'][key]
            refs=receipt['referenceImages'];assert len(refs)==(2 if category=='characters'else 1)
            if category=='characters':
                assert refs[0]['path']=='art/production/portraits/'+key+'.png' and refs[0]['role']=='edit target; preserve existing character identity, face, age, hair and clothing'
            assert refs[-1]['path']=='art/redesign/scenes/cave-v1.png' and refs[-1]['role']=='style reference only; materials, palette and lighting, no scenery or objects'
            for ref in refs:
                path=(root/ref['path']).resolve();assert path.is_relative_to(root) and hashlib.sha256(path.read_bytes()).hexdigest()==ref['sha256']
            for proof_key in ['alphaProof','runtimeAlphaProof']:
                proof=receipt[proof_key];assert proof['min']==0 and 250<=proof['max']<=255 and proof['transparentPixels']>10000 and proof['solidPixels']>10000 and proof['intermediatePixels']>=0
                dims=source['dimensions']if proof_key=='alphaProof'else runtime['dimensions']
                assert proof['transparentPixels']+proof['solidPixels']+proof['intermediatePixels']==dims['width']*dims['height']
            assert receipt['encoding'][:8]==['cwebp','-q','82','-m','6','-alpha_q','100','-resize']
    variants=m['presentationVariants'];assert len(variants)==1
    row=variants[0];assert row['id']=='cave-meditation'
    source,runtime=row['source'],row['runtime'];fact(source,False);fact(runtime,False)
    assert source['path']=='art/redesign/scenes/cave-meditation-v1.png' and runtime['path']=='web/public/art/v2/scenes/cave-meditation.webp'
    assert runtime['bytes']<=500000 and all(runtime['dimensions'][axis]<=source['dimensions'][axis]for axis in ['width','height'])
    assert runtime['path'].removeprefix('web/public/')in binding
    parent=root/'art/redesign/scenes/cave-v1.png';assert row['sourceParentSHA256']==hashlib.sha256(parent.read_bytes()).hexdigest()
    descriptor=row['receipt'];assert descriptor['path']=='art/redesign/receipts/cave-meditation.json';receipt_file=(root/descriptor['path']).resolve();assert receipt_file.is_relative_to(root);data=receipt_file.read_bytes();assert hashlib.sha256(data).hexdigest()==descriptor['sha256'];receipt=json.loads(data)
    assert receipt['tool']=='built-in image_gen' and receipt['copiedUnchanged']is True and receipt['review']['actuallyViewed']is True
    assert receipt['id']=='cave-meditation' and receipt['sourceSHA256']==source['sha256'] and receipt['savedPath']==source['path'] and receipt['runtime']==runtime and row['reviewSourceHash']==source['sha256']
    assert receipt['promptReference']=='art/redesign/receipts/meditation-prompts.json#cave-meditation'
    assert json.loads((root/'art/redesign/receipts/meditation-prompts.json').read_text())['prompts']['cave-meditation']
    assert [r['path']for r in receipt['referenceImages']]==['art/redesign/scenes/cave-v1.png','art/redesign/characters/player-v1.png']
    for ref in receipt['referenceImages']:assert hashlib.sha256((root/ref['path']).read_bytes()).hexdigest()==ref['sha256']
    return recorded,30
