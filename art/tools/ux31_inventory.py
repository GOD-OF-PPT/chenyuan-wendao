"""UX31 exact presentation evolution; all original source pins and actual budgets remain enforced."""
import hashlib,json,re
from pathlib import Path

LEDGER='art/redesign/ux31.json'
FACTS = {'RelicAtelier.vue': {'before': '9b2b585fc38b989cce519cd91c67e3108ead867a92aa502182af80b9fa5eab67',
                      'after': '10f5c8a995fd12da9cc92d0cecbd19281ec44319c6c8ca17c498f6dde629f96e',
                      'beforeBytes': 16083,
                      'bytes': 16108,
                      'baseline': 'goal-4/evidence/ux31/RelicAtelier.vue.before.txt'},
 'MarketCounter.vue': {'before': 'c8849c784dd1d864a5787658e941b6fbe10305ee476e5ad8ffc2daa687478b3e',
                       'after': '9b6ca02cd3c7bbb58f5e73f9b59e853a159e9b46545043548418354e6a20a310',
                       'beforeBytes': 10044,
                       'bytes': 10082,
                       'baseline': 'goal-4/evidence/ux31/MarketCounter.vue.before.txt'},
 'RecoveryPlanner.vue': {'before': 'cfebbad097fcd2d1913fc510fae511e665aa0403c6e3fd0acbbeed2ac0d4ab67',
                         'after': '3bce24833d9cbf3ecc3d0733520ff4d9e6fafc869ec24d6d526ba33aaa61cb1b',
                         'beforeBytes': 8554,
                         'bytes': 8552,
                         'baseline': 'goal-4/evidence/ux31/RecoveryPlanner.vue.before.txt'},
 'LearningPlanner.vue': {'before': '916581594274b568bf22fea242edacf375c7cf53a96ec4ca3766adad58db3d1b',
                         'after': 'a9202d043c1ba1875a9c7706b7c80bf071667afd966081e7ac203b57c5763a78',
                         'beforeBytes': 18613,
                         'bytes': 18625,
                         'baseline': 'goal-4/evidence/ux31/LearningPlanner.vue.before.txt'},
 'JadeStudyScene.vue': {'before': '434b16c05e5e6870cb67dc1f6611a81637864b0e20463c8bfd93e4c395d675ed',
                        'after': '10856e9645c1e7944da5ef0d98951a6a3d4a282dedd979863f6e9b2985fb29b9',
                        'beforeBytes': 5253,
                        'bytes': 5225,
                        'baseline': 'goal-4/evidence/ux31/JadeStudyScene.vue.before.txt'},
 'art11-inventory.css': {'before': '62b4382c926596b800f24e7483931367aa28aa0d1a235d78280269862c061461',
                         'after': 'fcc3dfcf1299e9f8b2a81822ac15f54899ef5f274a08f9359d34af3eb7b9ed44',
                         'beforeBytes': 12073,
                         'bytes': 12301,
                         'baseline': 'goal-4/evidence/ux31/art11-inventory.css.before.txt'}}
OPERATIONS = {'RelicAtelier.vue': [['<strong data-testid="production-relic-state">',
                       '<strong data-testid="production-relic-state" style="white-space:pre-line">'],
                      ["'已炼成 · 尚未装备'", "'已炼成\\n尚未装备'"],
                      ["'器谱冷胚示意 · 尚未炼成'", "'器谱冷胚示意\\n尚未炼成'"],
                      ['{{row.required}} · 保留 {{row.reserve}}', '{{row.required}}<br>保留 {{row.reserve}}']],
 'MarketCounter.vue': [["'购入 · 灵石换物'", "'购入\\n灵石换物'"],
                       ["'售出 · 物资换石'", "'售出\\n物资换石'"],
                       ["'支付灵石，物资入囊'", "'支付灵石\\n物资入囊'"],
                       ["'交出物资，收取灵石'", "'交出物资\\n收取灵石'"],
                       ["'保留此物用于突破筹备'", "'保留此物\\n用于突破筹备'"],
                       ['.counter-exchange strong{font-size:18px;color:#e0dfb2;line-height:1.4}',
                        '.counter-exchange '
                        'strong{font-size:18px;color:#e0dfb2;line-height:1.4;white-space:pre-line}'],
                       ['.counter-exchange small{font-size:14px;line-height:1.45}',
                        '.counter-exchange small{font-size:14px;line-height:1.45;white-space:pre-line}']],
 'RecoveryPlanner.vue': [["' 丹 · 库存保留 '", "' 丹\\n库存保留 '"]],
 'LearningPlanner.vue': [['restart.same&&!conflict?restart.label:', "restart.same&&!conflict?'原已保存安排':"],
                         ['restart.same?restart.label:', "restart.same?'上方继续研习':"],
                         ['<div v-if="!conflict" class="preparation-estimate" '
                          'data-testid="preparation-estimate"><template v-if="restart.same"><strong '
                          'data-testid="paused-plan-progress">{{restart.summary}} '
                          "{{mode==='manual'?'次':'卷'}}</strong><small>{{restart.note}}</small></template><template "
                          'v-else><strong>{{forecast.title}}</strong><small>{{forecast.reason}}</small><small>{{planningNote}}</small></template></div>',
                          '<div v-if="!conflict&&!restart.same" class="preparation-estimate" '
                          'data-testid="preparation-estimate"><strong>{{forecast.title}}</strong><small>{{forecast.reason}}</small><small>{{planningNote}}</small></div>'],
                         ['<div class="preparation-estimate" data-testid="learning-full-estimate">',
                          '<div class="preparation-estimate" data-testid="learning-full-estimate"><template '
                          'v-if="restart.same&&!conflict"><strong '
                          'data-testid="paused-plan-progress">{{restart.summary}} '
                          "{{mode==='manual'?'次':'卷'}}</strong><small>{{restart.note}}</small></template>"]],
 'JadeStudyScene.vue': [['<small v-else-if="!manual||!mastered">{{manual?\'一次60秒\':\'逐卷30秒\'}} · '
                         '实际成果自动保存</small>',
                         '<small v-else-if="!manual||!mastered">{{manual?\'一次60秒\':\'逐卷30秒\'}}</small>']],
 'art11-inventory.css': [['>.item-artifact{filter:brightness(.95)}\n'
                          '#app .art11-inventory[data-item=dao] .inventory-held>.item-artifact{scale:1.06}\n',
                          '>.item-artifact{filter:brightness(.95)}\n'
                          '#app .art11-inventory[data-item=dao] .inventory-held>.item-artifact{scale:1.06}\n'
                          '\n'
                          '/* UX31: separate the bowl without shrinking the fallback icon or text. */\n'
                          '#app .art11-recovery .recovery-vessel:has(.asset-fallback) '
                          '.recovery-jade-bowl{bottom:6px}\n'
                          '#app .art11-recovery .supply-plan-open{white-space:pre-line}\n']]}
MARKERS = {'RelicAtelier.vue': 'style="white-space:pre-line"',
 'MarketCounter.vue': '购入\\n灵石换物',
 'RecoveryPlanner.vue': '丹\\n库存保留',
 'LearningPlanner.vue': '上方继续研习',
 'JadeStudyScene.vue': '<small v-else-if="!manual||!mastered">{{manual?\'一次60秒\':\'逐卷30秒\'}}</small>',
 'art11-inventory.css': '/* UX31:'}
GROUPS = {'art03': {'cap': 45000,
           'field': 'maxNativeBytes',
           'files': ['web/src/JadeStudyScene.vue',
                     'web/src/RelicAtelier.vue',
                     'web/src/LoadoutConstellation.vue',
                     'web/src/equipment-effects.ts',
                     'web/src/art03-equipment.css'],
           'ledgerSHA256': 'a2a078e6ee338a17286a6c159767334f26a2698cd5848767932993ad7f124cef'},
 'art04': {'cap': 40000,
           'field': 'maxNativeBytes',
           'files': ['web/src/InventoryStage.vue',
                     'web/src/MarketCounter.vue',
                     'web/src/RecoveryRitual.vue',
                     'web/src/supply-effects.ts'],
           'ledgerSHA256': '3c974385497778839dce79472058baffbfec33a56f5610bcf7e1221fdb7e7953'},
 'idle-preparation': {'cap': 60000,
                      'field': 'maxNativeBytes',
                      'files': ['web/src/LearningPlanner.vue',
                                'web/src/MarketPlanner.vue',
                                'web/src/RecoveryPlanner.vue',
                                'web/src/ConfigurationDialog.vue',
                                'web/src/preparation-view.ts',
                                'web/src/idle-preparation.css'],
                      'ledgerSHA256': 'bad1cbd7a8e23cdf505f6e055c6cf75ab4886a009a500f8f041e6ef94c58cf51'},
 'art11': {'cap': 18000,
           'field': 'nativeBytes',
           'files': ['web/src/ItemArtifact.vue', 'web/src/art11-inventory.css'],
           'ledgerSHA256': '1c8386db34f346ba297648f2a229b07695e96c26dfd2b50593adc240836f6ed0'},
 'art10': {'cap': 12000,
           'field': 'nativeBytes',
           'files': ['web/src/art10-equipment.css'],
           'ledgerSHA256': '8cd48a189b340271c3c9321c48804c47a2d0c110573ddb8e25cdb7b74b06b121'}}
REFS = ['docs/decisions/0092-visual-readability-ux31-contract.md',
 'goal-4/amendments/2026-11-03-ux31-input.md',
 'goal-4/research/ux31-readability-sources.json',
 'art/redesign/ux31-display-edits.json',
 'goal-4/evidence/ux31/RelicAtelier.vue.before.txt',
 'goal-4/evidence/ux31/MarketCounter.vue.before.txt',
 'goal-4/evidence/ux31/RecoveryPlanner.vue.before.txt',
 'goal-4/evidence/ux31/LearningPlanner.vue.before.txt',
 'goal-4/evidence/ux31/JadeStudyScene.vue.before.txt',
 'goal-4/evidence/ux31/art11-inventory.css.before.txt']


def prior_ux31_bytes(path,raw):
    name=Path(path).name
    if name not in FACTS or MARKERS[name].encode() not in raw:
        return raw
    assert hashlib.sha256(raw).hexdigest()==FACTS[name]['after'], 'UX31 complete source changed outside the exact display edits: '+name
    text=raw.decode()
    for before,after in reversed(OPERATIONS[name]):
        assert text.count(after)==1, 'UX31 unique inverse display span: '+name
        text=text.replace(after,before,1)
    assert hashlib.sha256(text.encode()).hexdigest()==FACTS[name]['before'], 'UX31 entire original source'
    return text.encode()

def normalize_ux31(name,text):
    return prior_ux31_bytes(name,text.encode()).decode()

def validate_ux31(root):
    root=Path(root).resolve()
    def local(name):
        p=root/name
        assert p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(root), 'UX31 local input'
        return p
    if not (root/LEDGER).exists():
        assert not any((root/'web/src'/n).exists() and MARKERS[n].encode() in (root/'web/src'/n).read_bytes() for n in FACTS), 'UX31 unrecorded display evolution'
        return set(),0
    m=json.loads(local(LEDGER).read_text())
    assert set(m)=={'format','version','userAcceptance','newRasterAssets','maxAddedCSSBytes','files','baselines','sourceReferences'}, 'UX31 exact ledger shape'
    assert m['format']=='chenyuan-readability-ux31' and type(m['version']) is int and m['version']==1 and m['userAcceptance'] is False, 'UX31 scope'
    assert type(m['newRasterAssets']) is int and m['newRasterAssets']==0 and type(m['maxAddedCSSBytes']) is int and m['maxAddedCSSBytes']==400, 'UX31 asset/CSS limits'
    assert m['sourceReferences']==REFS and json.loads(local('art/redesign/ux31-display-edits.json').read_text())==OPERATIONS, 'UX31 exact published scope'
    assert m['files']==[{'path':'web/src/'+n,'bytes':f['bytes'],'sha256':f['after']} for n,f in FACTS.items()], 'UX31 actual source ledger'
    assert m['baselines']==[{'path':f['baseline'],'bytes':f['beforeBytes'],'sha256':f['before']} for f in FACTS.values()], 'UX31 old whole-file pins'
    for n,f in FACTS.items():
        raw=local('web/src/'+n).read_bytes();old=local(f['baseline']).read_bytes()
        assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['after'], 'UX31 current whole source'
        assert len(old)==f['beforeBytes'] and hashlib.sha256(old).hexdigest()==f['before'], 'UX31 preserved original'
        assert prior_ux31_bytes(n,raw)==old, 'UX31 full inverse'
        if n.endswith('.vue'):
            script=lambda data: re.search(b'<script setup.*?</script>',data,re.S).group()
            assert script(raw)==script(old), 'UX31 original script and write/clock ownership'
    for name,g in GROUPS.items():
        raw=local('art/redesign/'+name+'.json').read_bytes();old=json.loads(raw)
        assert hashlib.sha256(raw).hexdigest()==g['ledgerSHA256'], 'UX31 old ledger cannot be resigned'
        assert old.get('budgets',{}).get(g['field'],old.get(g['field']))==g['cap'] and [r['path'] for r in old['files']]==g['files'], 'UX31 old regional cap/members'
        assert sum(local(p).stat().st_size for p in g['files'])<=g['cap'], 'UX31 actual regional bytes exceed original cap'
    assert local('web/src/art11-inventory.css').stat().st_size<=14000, 'UX31 actual ART11 CSS cap'
    css=local('web/src/art11-inventory.css').read_bytes()[FACTS['art11-inventory.css']['beforeBytes']:]
    styles=lambda data: sum(len(s) for s in re.findall(b'<style[^>]*>(.*?)</style>',data,re.S))
    market=local('web/src/MarketCounter.vue').read_bytes();old=local(FACTS['MarketCounter.vue']['baseline']).read_bytes()
    added=len(css)+styles(market)-styles(old)+len('white-space:pre-line')
    assert 0<=added<=400, 'UX31 actual added CSS includes inline declarations'
    assert not re.search(rb'font-size|overflow|display\s*:\s*none|opacity\s*:\s*0|@import|@font-face|https?://',css), 'UX31 cannot clip shrink or hide to fit'
    for ref in REFS:local(ref)
    return {LEDGER,*REFS,*[r['path'] for r in m['files']]},sum(f['bytes'] for f in FACTS.values())
