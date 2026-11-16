"""Encode selected image_gen originals; never alter source pixels or invent alpha."""
from pathlib import Path
import argparse, hashlib, json, subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CHARACTERS = ['player', 'shen', 'lu', 'pei', 'yan']
ENEMIES = ['wolf', 'warden', 'serpent', 'puppet', 'shadow', 'sentinel', 'trial_heart', 'trial_thunder', 'trial_gate']

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def alpha_fact(path):
    with Image.open(path) as image:
        image.load()
        assert image.mode == 'RGBA', 'No generated alpha: '+str(path)
        histogram = image.getchannel('A').histogram()
        assert histogram[0] > 10000 and sum(histogram[250:]) > 10000, 'Opaque background or absent subject'
        return dict(transparentPixels=histogram[0], solidPixels=sum(histogram[250:]), intermediatePixels=sum(histogram[1:250]), min=next(i for i,n in enumerate(histogram) if n), max=max(i for i,n in enumerate(histogram) if n))

def fact(path):
    with Image.open(path) as image:
        image.load()
        return dict(path=path.relative_to(ROOT).as_posix(), bytes=path.stat().st_size, sha256=digest(path), dimensions=dict(width=image.width,height=image.height), alpha=image.mode=='RGBA', format=path.suffix[1:])

def export(generations=None):
    selected=json.loads(Path(generations).read_text()) if generations else None
    groups={}
    for category,ids,limit,width in [('characters',CHARACTERS,80000,512),('enemies',ENEMIES,120000,512)]:
        rows=[]
        for key in ids:
            receipt_path=ROOT/'art/redesign/receipts'/category/(key+'.json')
            if selected:
                generation=selected[key]
                assert generation['actuallyViewed'] is True
                original=ROOT/generation['savedPath']
                assert digest(original)==generation['sha256']
                # The selected tool output stays unchanged in both locations.
                assert digest(Path(generation['sourcePath']))==digest(original)
                refs=[]
                if category=='characters':
                    ref=ROOT/'art/production/portraits'/(key+'.png')
                    refs.append(dict(path=ref.relative_to(ROOT).as_posix(),sha256=digest(ref),role='edit target; preserve existing character identity, face, age, hair and clothing'))
                ref=ROOT/'art/redesign/scenes/cave-v1.png'
                refs.append(dict(path=ref.relative_to(ROOT).as_posix(),sha256=digest(ref),role='style reference only; materials, palette and lighting, no scenery or objects'))
                receipt=dict(id=key,category=category,tool='built-in image_gen',sourcePath=generation['sourcePath'],savedPath=generation['savedPath'],copiedUnchanged=True,sourceSHA256=digest(original),promptReference='art/redesign/receipts/'+('character' if category=='characters' else 'enemy')+'-prompts.json#'+key,referenceImages=refs,review=dict(actuallyViewed=True,scope='agent source inspection, not user art acceptance',observation='Single existing character identity or configured enemy subject; no UI, readable text or watermark observed.'),requestedResolution='native available square PNG',resolutionNote='Actual tool output recorded, no upscaling or4K claim')
            else:
                receipt=json.loads(receipt_path.read_text());original=ROOT/receipt['savedPath']
                assert digest(original)==receipt['sourceSHA256']
            source=fact(original);proof=alpha_fact(original)
            runtime=ROOT/'web/public/art/v2'/category/(key+'.webp');runtime.parent.mkdir(parents=True,exist_ok=True)
            size=min(width,source['dimensions']['width'])
            encoding=['cwebp','-q','82','-m','6','-alpha_q','100','-resize',str(size),'0','-metadata','none']
            subprocess.run([encoding[0],'-quiet',*encoding[1:],str(original),'-o',str(runtime)],check=True)
            encoded=fact(runtime);runtime_alpha=alpha_fact(runtime)
            assert encoded['bytes']<=limit, (key,encoded['bytes'],limit)
            assert encoded['dimensions']['width']<=source['dimensions']['width'] and encoded['dimensions']['height']<=source['dimensions']['height']
            receipt.update(sourceDimensions=source['dimensions'],sourceBytes=source['bytes'],alphaProof=proof,runtimeAlphaProof=runtime_alpha,runtime=encoded,encoding=encoding,encoderVersion=subprocess.check_output(['cwebp','-version'],text=True).strip())
            receipt_path.parent.mkdir(parents=True,exist_ok=True);receipt_path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
            rows.append(dict(id=key,source=source,runtime=encoded,receipt=dict(path=receipt_path.relative_to(ROOT).as_posix(),sha256=digest(receipt_path)),reviewSourceHash=source['sha256']))
        groups[category]=rows
    receipt_path=ROOT/'art/redesign/receipts/cave-meditation.json'
    receipt=json.loads(receipt_path.read_text());original=ROOT/receipt['savedPath'];assert digest(original)==receipt['sourceSHA256']
    runtime=ROOT/'web/public/art/v2/scenes/cave-meditation.webp'
    encoding=['cwebp','-q','84','-m','6','-resize','1536','0','-metadata','none']
    subprocess.run([encoding[0],'-quiet',*encoding[1:],str(original),'-o',str(runtime)],check=True)
    source,encoded=fact(original),fact(runtime);assert not source['alpha'] and not encoded['alpha'] and encoded['bytes']<=500000
    assert all(encoded['dimensions'][axis]<=source['dimensions'][axis]for axis in ['width','height'])
    receipt.update(sourceDimensions=source['dimensions'],sourceBytes=source['bytes'],runtime=encoded,encoding=encoding,encoderVersion=subprocess.check_output(['cwebp','-version'],text=True).strip())
    receipt_path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    presentation=[dict(id='cave-meditation',source=source,runtime=encoded,receipt=dict(path=receipt_path.relative_to(ROOT).as_posix(),sha256=digest(receipt_path)),reviewSourceHash=source['sha256'],sourceParentSHA256=digest(ROOT/'art/redesign/scenes/cave-v1.png'))]
    refs=['goal-2/input.md','goal-2/plan.md','goal-2/amendments/2026-10-18-art-first-mobile-last.md','docs/implementation/goal-2-character-battle-art.md','art/redesign/CHARACTER_BATTLE_REVIEW.md','goal-2/amendments/2026-10-18-desktop-design-application.md']
    manifest=dict(format='chenyuan-character-battle-inventory',version=2,task='Goal2 T03',characters=groups['characters'],enemies=groups['enemies'],presentationVariants=presentation,activeCharacterIds=CHARACTERS,activeEnemyIds=ENEMIES,bindingFile='web/src/assets.ts',sourceReferences=refs,budgets=dict(characters=5,enemies=9,maxCharacterBytes=80000,maxEnemyBytes=120000,presentationVariants=1,maxPresentationBytes=500000),rights=dict(productionUseApproved=True,distributionLicense=None,userAcceptance=False,evidenceReferences=refs[:3]),proofScope='Source, export, decoded alpha and agent visual inspection; not user acceptance or a distribution license.')
    (ROOT/'art/redesign/character-battle-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(characters=5,enemies=9,runtimeBytes=sum(x['runtime']['bytes']for x in [item for rows in groups.values()for item in rows]+presentation),files=[x['runtime']for x in [item for rows in groups.values()for item in rows]+presentation])))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--generations');export(parser.parse_args().generations)
