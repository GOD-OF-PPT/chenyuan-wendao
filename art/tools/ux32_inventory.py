from ux33_inventory import prior_ux33_bytes
"""UX32 exact template evolution; no clock, save, script or style change."""
import hashlib,json,re
from pathlib import Path
LEDGER='art/redesign/ux32.json'
FACTS={'MarketPlanner.vue': {'before': '133ca11bcb8b8c283b3138cc88add796fdc22f507781869e27fb2025b379c760',
                       'after': 'e015c642208184c806464b976f450b3dcca74c6d78c17db42312d7ba7a26b588',
                       'beforeBytes': 12464,
                       'bytes': 12469,
                       'baseline': 'goal-4/evidence/ux32/MarketPlanner.vue.before.txt'},
 'MarketCounter.vue': {'before': '366fec4997cf9406d40ae43dcd21fdc0e66740370fc29a570d7422aaabbc432e',
                       'after': 'bcde3e3c643a29868995d52a197e6e1553b37745771866bd9e3a69b04f0d780e',
                       'beforeBytes': 10084,
                       'bytes': 10062,
                       'baseline': 'goal-4/evidence/ux32/MarketCounter.vue.before.txt'}}
OPERATIONS={'MarketPlanner.vue': [['翻看货架 · 更换物资与购售', '翻看货架'],
                       ["'下次安排草案 · "
                        "当前执行见活动条':sameSaved&&planSaved?'已保存安排；修改后须重新确认':'待确认的新安排，确认后才开始'",
                        "'下次草案 · "
                        "原活动不变':sameSaved&&planSaved||restart.same?'已保存安排':'待确认'"],
                       ['<strong class="market-price">',
                        '<strong v-if="mode===\'buy\'||item.sell!==null" '
                        'class="market-price">'],
                       ["{{mode==='buy'?item.buy:item.sell??'不可出售'}}",
                        "{{mode==='buy'?item.buy:item.sell}}"],
                       ['调整本段安排 ›', '调整 ›'],
                       ['    <div class="preparation-estimate" '
                        'data-testid="preparation-estimate"><template '
                        'v-if="restart.same"><strong '
                        'data-testid="paused-plan-progress">{{restart.summary}} '
                        '件</strong><small>{{restart.note}}</small></template><template '
                        'v-else><strong>预计成交 {{quote?.cycles??0}} 件 · '
                        "{{mode==='buy'?'灵石消耗 '+(quote?.stones??0):'灵石收入 "
                        "'+(quote?.earnedStones??0)}}</strong><small>{{mode==='buy'?'逐件入囊，目标为最终库存':'逐件扣除库存，突破物不可出售；药物也受保留量约束'}}</small><small>{{quote?.failure?.message??(quote?.stopReason?'预计停止：'+quote.stopReason.message:'')}}</small><small "
                        'v-if="consumptionWarning" '
                        'data-testid="market-consumption">整段出售：{{consumptionWarning}}</small></template></div>',
                        '    <div class="preparation-estimate" '
                        'data-testid="preparation-estimate"><strong>{{conflict||(mode===\'sell\'&&item.sell===null?\'突破物不可出售\':restart.same?\'\':quote?.failure?.message)}}</strong><small '
                        'v-if="consumptionWarning" '
                        'data-testid="market-consumption">整段出售：{{consumptionWarning}}</small></div>'],
                       ['前往云岚坊市 · 不自动成交', '前往坊市 · 6秒，不成交'],
                       ["{{conflict?'当前暂不可安排':restart.same?restart.label:restart.label+(mode==='buy'?'安排购入'+item.name:'安排售出'+item.name)}}",
                        "{{restart.same?'上方继续交易':restart.label+(mode==='buy'?'开始购入'+item.name:'开始售出'+item.name)}}"],
                       [':disabled="!!conflict||restart.same||!quote?.allowed">{{restart.same?\'上方继续交易\':restart.label+(mode===\'buy\'?\'开始购入\'+item.name:\'开始售出\'+item.name)}}</button><small '
                        'class="preparation-reason">{{conflict||\'限于本段安排；不自动补货、换物或旅行。\'}}</small>',
                        ':disabled="!!conflict||restart.same||!quote?.allowed">{{restart.same?\'上方继续交易\':restart.label+(mode===\'buy\'?\'开始购入\'+item.name:\'开始售出\'+item.name)}}</button>'],
                       ['<p>只调整待确认草案，关闭保留参数；返回后另行确认才成交。</p>',
                        '<p>关闭保留调整，返回后确认；逐件成交免领取。</p><div '
                        'class="preparation-estimate" '
                        'data-testid="market-full-estimate"><template '
                        'v-if="restart.same"><strong '
                        'data-testid="paused-plan-progress">{{restart.summary}} '
                        '件</strong><small>{{restart.note}}</small></template><template '
                        'v-else-if="quote?.allowed"><strong>预计成交 '
                        "{{quote.cycles}} 件 · {{mode==='buy'?'灵石消耗 "
                        "'+quote.stones:'灵石收入 "
                        "'+quote.earnedStones}}</strong><small>{{mode==='buy'?'逐件入囊':'逐件出售，保留库存；突破物禁售'}}</small><small>{{quote?.stopReason?'预计停止：'+quote.stopReason.message:''}}</small></template><strong "
                        "v-else>{{mode==='sell'&&item?.sell===null?'突破物不可出售':quote?.failure?.message}}</strong><small>仅执行本单，不自动接续其他行动。</small></div>"],
                       ['<label>累计采购灵石预算<input', '<label>用石上限<input'],
                       ['<label>采购灵石保留量<input', '<label>灵石保留<input'],
                       ['<label>本段最多（件）<input', '<label>最多件数<input'],
                       ['完成调整 · 返回货架', '返回货架'],
                       ["{{mode==='buy'?'购入':'售出'}}安排</h3>",
                        "{{mode==='buy'?'购入':'售出'}}</h3>"],
                       ['本段最多 {{count}} 件', '最多 {{count}} 件'],
                       ['>目标库存<input', '>目标总库存<input']],
 'MarketCounter.vue': [['<div class="counter-cycle" '
                        'data-testid="market-cycle-status">',
                        '<div v-if="state!==\'idle\'||totals" '
                        'class="counter-cycle" '
                        'data-testid="market-cycle-status">'],
                       ['<small v-else>15 秒 / 件 · 无需逐件领取</small>',
                        '<small v-else>15 秒 / 件</small>'],
                       ['<small '
                        'class="counter-realm">需{{C.realms[item.min].name}}{{mode===\'sell\'?\'（出售按正式资格）\':\'\'}}</small>',
                        '<small v-if="mode===\'buy\'" '
                        'class="counter-realm">需{{C.realms[item.min].name}}</small>']]}
MANIFEST={'format': 'chenyuan-market-copy-ux32',
 'version': 1,
 'userAcceptance': False,
 'newRasterAssets': 0,
 'addedCSSBytes': 0,
 'files': [{'path': 'web/src/MarketPlanner.vue',
            'bytes': 12469,
            'sha256': 'e015c642208184c806464b976f450b3dcca74c6d78c17db42312d7ba7a26b588'},
           {'path': 'web/src/MarketCounter.vue',
            'bytes': 10062,
            'sha256': 'bcde3e3c643a29868995d52a197e6e1553b37745771866bd9e3a69b04f0d780e'}],
 'sourceReferences': ['docs/decisions/0093-market-copy-ux32-contract.md',
                      'goal-4/amendments/2026-11-04-ux32-input.md',
                      'goal-4/research/ux32-market-clarity-sources.json',
                      'art/redesign/ux32-display-edits.json',
                      'goal-4/evidence/ux32/MarketPlanner.vue.before.txt',
                      'goal-4/evidence/ux32/MarketCounter.vue.before.txt']}
MARKERS={'MarketPlanner.vue':'market-full-estimate','MarketCounter.vue':"v-if=\"state!=='idle'||totals\""}
def prior_ux32_bytes(path,raw):
    raw=prior_ux33_bytes(path,raw)
    name=Path(path).name
    if name not in FACTS or MARKERS[name].encode() not in raw:return raw
    assert hashlib.sha256(raw).hexdigest()==FACTS[name]['after'], 'UX32 complete display source changed'
    text=raw.decode()
    for before,after in reversed(OPERATIONS[name]):
        assert after and text.count(after)==1, 'UX32 unique full inverse span'
        text=text.replace(after,before,1)
    assert hashlib.sha256(text.encode()).hexdigest()==FACTS[name]['before'], 'UX32 original full source'
    return text.encode()
def validate_ux32(root):
    root=Path(root).resolve()
    def local(n):
        f=root/n
        assert f.is_file() and not f.is_symlink() and f.resolve().is_relative_to(root), 'UX32 local source'
        return f
    if not (root/LEDGER).exists():
        assert not any((root/'web/src'/n).exists() and MARKERS[n].encode() in (root/'web/src'/n).read_bytes() for n in FACTS), 'UX32 unrecorded template change'
        return set(),0
    assert json.loads(local(LEDGER).read_text())==MANIFEST, 'UX32 scope cannot be resigned'
    assert json.loads(local('art/redesign/ux32-display-edits.json').read_text())==OPERATIONS, 'UX32 exact inverse operations'
    for n,f in FACTS.items():
        raw=prior_ux33_bytes(n,local('web/src/'+n).read_bytes());old=local(f['baseline']).read_bytes()
        assert len(raw)==f['bytes'] and hashlib.sha256(raw).hexdigest()==f['after'], 'UX32 actual source pin'
        assert len(old)==f['beforeBytes'] and hashlib.sha256(old).hexdigest()==f['before'], 'UX32 original source pin'
        assert prior_ux32_bytes(n,raw)==old, 'UX32 complete inverse'
        for pattern in [rb'<script setup.*?</script>',rb'<style.*?</style>']:
            assert re.findall(pattern,raw,re.S)==re.findall(pattern,old,re.S), 'UX32 script/clock/style ownership'
    for ref in MANIFEST['sourceReferences']:local(ref)
    return {LEDGER,*MANIFEST['sourceReferences'],*['web/src/'+n for n in FACTS]},sum(local('web/src/'+n).stat().st_size for n in FACTS)
