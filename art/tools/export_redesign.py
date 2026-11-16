"""Encode selected Goal2 scene originals; retain original pixels and exact tool receipts."""
from pathlib import Path
import hashlib, json, subprocess
from check_inventory import image_info

ROOT = Path(__file__).resolve().parents[2]
SCENES = ['opening', 'wilderness', 'cave', 'sect', 'market', 'secret', 'terrace']

def fact(path):
    data = path.read_bytes()
    dimensions, alpha, fmt = image_info(data, path.suffix)
    return dict(path=path.relative_to(ROOT).as_posix(), bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), dimensions=dimensions, alpha=alpha, format=fmt)

def export():
    rows = []
    for key in SCENES:
        receipt_path = ROOT / 'art/redesign/receipts' / (key + '.json')
        receipt = json.loads(receipt_path.read_text())
        original = ROOT / receipt['savedPath']
        assert fact(original)['sha256'] == receipt['sourceSHA256']
        runtime = ROOT / 'web/public/art/v2/scenes' / (key + '.webp')
        runtime.parent.mkdir(parents=True, exist_ok=True)
        width = min(1536, receipt['sourceDimensions']['width'])
        args = ['cwebp', '-quiet', '-q', '84', '-m', '6', '-resize', str(width), '0', '-metadata', 'none', str(original), '-o', str(runtime)]
        subprocess.run(args, check=True)
        source, encoded = fact(original), fact(runtime)
        assert encoded['bytes'] <= 500000 and encoded['dimensions']['width'] <= source['dimensions']['width']
        receipt.update(runtime=encoded, encoderVersion=subprocess.check_output(['cwebp', '-version'], text=True).strip(), encoding=['cwebp', '-q', '84', '-m', '6', '-resize', str(width), '0', '-metadata', 'none'])
        (receipt_path).write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
        rows.append(dict(id=key, source=source, runtime=encoded, receipt=fact_json(receipt_path), reviewSourceHash=source['sha256']))
    variants = []
    for gate in ['storm', 'opened']:
        key='terrace-'+gate
        receipt_path=ROOT/'art/redesign/receipts'/(key+'.json')
        receipt=json.loads(receipt_path.read_text())
        original=ROOT/receipt['savedPath'];runtime=ROOT/'web/public/art/v2/scenes'/(key+'.webp')
        assert fact(original)['sha256']==receipt['sourceSHA256']
        subprocess.run(['cwebp','-quiet','-q','84','-m','6','-resize','1536','0','-metadata','none',str(original),'-o',str(runtime)],check=True)
        source,encoded=fact(original),fact(runtime)
        assert encoded['bytes']<=500000
        receipt.update(runtime=encoded,encoderVersion=subprocess.check_output(['cwebp','-version'],text=True).strip(),encoding=['cwebp','-q','84','-m','6','-resize','1536','0','-metadata','none'])
        receipt_path.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
        variants.append(dict(gate=gate,source=source,runtime=encoded,receipt=fact_json(receipt_path),sourceParentSHA256=next(x for x in rows if x['id']=='terrace')['source']['sha256']))
    refs = ['goal-2/input.md', 'goal-2/plan.md', 'goal-2/amendments/2026-10-18-art-first-mobile-last.md', 'goal-2/design/desktop-direction-v1.png', 'art/redesign/REVIEW.md']
    manifest = dict(format='chenyuan-redesign-scene-inventory', version=1, task='Goal2 T02', activeSceneIds=SCENES, scenes=rows,
        inputs=[dict(**fact(ROOT / 'art/redesign/scenes/terrace-v1.png'), receipt='art/redesign/receipts/terrace-v1-input.json', role='retained edit input; accidental inscription rejected, never a runtime scene')],
        stageVariants=variants,sourceReferences=refs, bindingFile='web/src/assets.ts', rights=dict(productionUseApproved=True, distributionLicense=None, userAcceptance=False, evidenceReferences=refs[:3]),
        budgets=dict(sceneMasters=7, stageVariants=2, maxSceneBytes=500000), proofScope='Source, export and agent inspection facts; not user art acceptance or a new distribution license.')
    (ROOT / 'art/redesign/manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'scenes':len(rows),'stageVariants':len(variants),'runtimeBytes':sum(x['runtime']['bytes'] for x in rows+variants),'files':[{**x['runtime'],'id':x.get('id','terrace-'+x.get('gate',''))}for x in rows+variants]},ensure_ascii=False))

def fact_json(path):
    data=path.read_bytes()
    return dict(path=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(data).hexdigest())

if __name__ == '__main__':
    export()
