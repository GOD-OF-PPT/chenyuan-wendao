#!/usr/bin/env python3
"""Re-export known generated PNGs and record facts; never fabricate sources or user acceptance."""
from pathlib import Path
import copy,hashlib,json,subprocess
from check_inventory import image_info
ROOT=Path(__file__).resolve().parents[2]
KEYS=['wilderness','settlement','secret','terrace','player','shen','lu','pei','yan']

def fact(path):
    data=path.read_bytes();dimensions,alpha,fmt=image_info(data,path.suffix)
    return dict(exportedPath=path.relative_to(ROOT).as_posix(),dimensions=dimensions,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),format=fmt,alpha=alpha)

def update():
    path=ROOT/'art/asset-manifest.json';manifest=json.loads(path.read_text());byid={x['id']:x for x in manifest['assets']};masters=[]
    for key in KEYS:
        portrait=key in ['player','shen','lu','pei','yan'];category='portrait' if portrait else 'scene';name='terrace-v2' if key=='terrace' else key;group='portraits' if portrait else 'scenes'
        asset=byid[category+'-'+key];master=ROOT/'art/production'/group/(name+'.png');runtime=ROOT/'web/public/art'/group/(name+'.webp')
        assert master.is_file(),str(master)
        subprocess.run(['cwebp','-quiet','-q','84','-m','6','-resize','512' if portrait else '1536','512' if portrait else '0','-metadata','none',str(master),'-o',str(runtime)],check=True)
        mf,rf=fact(master),fact(runtime);assert rf['bytes']<=(80000 if portrait else 500000)
        receipt_path='art/production/receipts/'+('terrace-v2' if key=='terrace' else key)+'.json';receipt=json.loads((ROOT/receipt_path).read_text());receipt.update(encoderVersion=subprocess.check_output(['cwebp','-version'],text=True).strip(),sourceSHA256=mf['sha256'],sourceDimensions=mf['dimensions'],runtimePath=rf['exportedPath'],runtimeSHA256=rf['sha256'],runtimeDimensions=rf['dimensions'],encoding='cwebp -q 84 -m 6 -resize '+('512 512' if portrait else '1536 0')+' -metadata none');(ROOT/receipt_path).write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
        rights=dict(intendedUse='user_authorized_project_production',productionUseApproved=True,distributionLicense=None,evidenceReferences=['goal-1/input.md','goal-1/plan.md','art/production/README.md',receipt_path],note='项目目标内制作使用有据；不是独立开放或发行许可，也不是法律权属结论。')
        master_id=asset['id']+'-master';masters.append(dict(inputAssets=receipt.get('inputAssets',[]),id=master_id,category=category+'_master',sourceType='built_in_image_gen',originalHash=mf['sha256'],sourceReference=[receipt_path,'art/production/receipts/prompts.json','art/production/README.md'],purpose=asset['purpose']+' 原生生成原稿（非历史原件）',status='production',availability='repo_file',rights=copy.deepcopy(rights),generationReceipt=receipt_path,**mf))
        asset.update(**rf,sourceType='webp_derivative',originalHash=mf['sha256'],sourceReference=[mf['exportedPath'],receipt_path,'art/tools/export_production.py','art/production/README.md'],status='production',availability='repo_file',rights=copy.deepcopy(rights),parentId=master_id,exportNotes={'encoding':receipt['encoding'],'resolutionDecision':'记录工具实际像素，仅缩小编码，不把放大图称作高分原件。','requestedSpecification':'targetSpec保留T16建议；当前实际尺寸见dimensions与父原稿。'})
        asset.pop('visualReview',None)
    manifest['assets']=[x for x in manifest['assets'] if x['category'] not in ['scene_master','portrait_master']]+masters
    input_id='scene-terrace-base-input'
    if not any(x['id']==input_id for x in manifest['assets']):
        source=ROOT/'art/production/scenes/terrace-closed.png';f=fact(source)
        manifest['assets'].append(dict(id=input_id,category='production_edit_input',sourceType='built_in_image_gen_edit_input',originalHash=f['sha256'],sourceReference=['art/production/receipts/terrace.json','art/production/README.md'],purpose='登仙台编辑输入云台原稿；非额外活动母版或运行场景',status='reference',availability='repo_file',rights=copy.deepcopy(byid['scene-terrace']['rights']),**f))
    for aid,file,typ in [('native-ui-kit','web/public/art/ui-kit.svg','svg'),('native-fx-kit','web/src/ActionEffects.vue','vue')]:
        asset=byid[aid];data=(ROOT/file).read_bytes();asset.update(exportedPath=file,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),originalHash=hashlib.sha256(data).hexdigest(),format=typ,dimensions={'width':24,'height':24} if typ=='svg' else None,alpha=True if typ=='svg' else None,status='production',availability='repo_file' if typ=='svg' else 'code_native',sourceType='project_authored_native',sourceReference=['art/production/README.md','art/tools/build_native_ui.py','web/src/ui-icons.ts'] if typ=='svg' else ['art/production/README.md','web/src/effects.ts','web/src/App.vue'],rights=dict(intendedUse='user_authorized_project_native_code',productionUseApproved=True,distributionLicense=None,evidenceReferences=['goal-1/input.md','goal-1/plan.md','art/production/README.md'],note='本项目独立编写，未引入第三方素材；不新增独立发行许可。'));asset.pop('visualReview',None)
        code_paths=['web/src/GameIcon.vue','web/src/ui-icons.ts','web/src/style.css','web/src/shell.css','web/src/focus.ts','web/src/LocalExperiencePanel.vue'] if typ=='svg' else ['web/src/effects.ts','web/src/ScenePanel.vue','web/src/AssetImage.vue','web/src/assets.ts']
        asset['codeComponents']=[{'path':code,'bytes':len((ROOT/code).read_bytes()),'sha256':hashlib.sha256((ROOT/code).read_bytes()).hexdigest()} for code in code_paths]
    manifest['productionUpdate']={'task':'T18','date':'2026-10-17','baseCommit':'6826f00bd0a8c87364b0f8909395388a2946a1aa','sources':'built-in image_gen, nine selected outputs plus one retained terrace edit input; native SVG/Vue/CSS authored in this repo','reviewBoundary':'Technical evidence separate from T25 user acceptance; no automatic visual-review promotion.'}
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    update();print('Recorded 9 original masters, 9 runtime derivatives, one native UI and one native FX kit.')
