<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useGame } from './store';
import * as C from '../../src/full/content.ts';
import { availableEvents, biography, intent } from '../../src/full/engine.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import { getBreakthroughGoal, previewAction } from '../../src/full/queries.ts';
import type { ActionPreview } from '../../src/full/queries.ts';
import type { Action, Move } from '../../src/full/types.ts';
import { stories } from '../../src/full/events.ts';
import { MAX_SAVE_BYTES } from '../../src/full/versions.ts';

const store = useGame(), name = ref('顾长青'), tab = ref('修行'), batch = ref(1), quantity = ref(1);
const large = ref(false), settings = ref<HTMLDialogElement>(), exportError = ref('');
const game = computed(() => store.game), core = computed(() => game.value?.core);
const realm = computed(() => C.realms[core.value?.player.realm ?? 'mortal']);
const location = computed(() => C.locations[core.value?.world.location ?? 'wilderness']);
const phase = computed(() => game.value ? gamePhase(game.value) : null);
const goal = computed(() => game.value ? getBreakthroughGoal(game.value) : null);
const age = computed(() => core.value ? Math.floor((core.value.player.startAgeMonths + core.value.world.elapsedMonths) / 12) : 18);
const scene = `${import.meta.env.BASE_URL}art/scene.webp`;
const context = computed(() => ({ state: game.value, cache: new Map<string, ActionPreview>() }));
function quote(action: Action) {
  const current = context.value;
  if (!current.state) return null;
  const key = JSON.stringify(action);
  if (!current.cache.has(key)) current.cache.set(key, previewAction(current.state, action));
  return current.cache.get(key)!;
}
const can = (action: Action) => store.available && !store.busy && !!quote(action)?.allowed;
const why = (action: Action) => !store.available ? '存储尚未就绪，请重新读取或导出原件' : quote(action)?.failure?.message ?? '';
function cost(action: Action) {
  const preview = quote(action), c = preview?.costs;
  if (!c) return '';
  const text = [c.stones ? `灵石 ${c.stones}` : '', c.mp ? `灵力 ${c.mp}` : '',
    ...Object.entries(c.items).map(([id, n]) => `${C.items[id].name} ×${n}`),
    c.months ? `${c.months} 游戏月` : ''].filter(Boolean).join(' · ') || '不消耗物资';
  return preview && preview.requestedSteps > 1 ? '每次 ' + text : text;
}
function act(action: Action) { return store.act(action); }
async function travel(id: C.LocationId) {
  await act({ type: 'TRAVEL', location: id });
  if (!store.error) tab.value = id === 'cave' ? '修行' : '历练';
}
const natural = computed<Action>(() => ({ type: 'CULTIVATE', method: 'natural', count: batch.value }));
const assisted = computed<Action>(() => ({ type: 'CULTIVATE', method: 'assisted', count: batch.value }));
const breakthrough = computed<Action>(() => ({ type: core.value?.player.realm === 'spirit' ? 'START_TRIAL' : 'BREAKTHROUGH' }));
const forecast = computed(() => game.value?.battle ? intent(game.value.battle) : null);
const activeStory = computed(() => core.value?.activeEvent ? stories[core.value.activeEvent.id] : null);
const events = computed(() => game.value ? availableEvents(game.value) : []);
const life = computed(() => game.value ? biography(game.value) : []);
const activeEnemies = computed(() => Object.entries(C.enemies).filter(([, e]) => !e.trial && e.location === core.value?.world.location));
const localSources = computed(() => Object.entries(C.sources).filter(([, s]) => s.location === core.value?.world.location));
const knownItems = computed(() => Object.entries(C.items).filter(([id, item]) => !core.value || C.rank(item.min) <= C.rank(core.value.player.realm) || core.value.inventory[id] > 0));
const localRecipes = computed(() => Object.entries(C.recipes).filter(([, recipe]) => !core.value || C.rank(recipe.min) <= C.rank(core.value.player.realm)));
const schoolName = computed(() => game.value?.school === 'sword' ? '剑修' : game.value?.school === 'talisman' ? '符修' : '尚未择法');
const spells = computed(() => ({
  technique: game.value?.loadout.builder ? C.skills[game.value.loadout.builder].name : '术法',
  release: game.value?.loadout.finisher ? C.skills[game.value.loadout.finisher].name : '终结术法',
}));
const fate = computed(() => core.value?.openingChoice === 'help' ? ['赠药之缘', '山雨中赠出回春丹，这次选择已留入来路。'] :
  core.value?.openingChoice === 'trade' ? ['两清之约', '以丹换取剑简，保留一份交易之缘。'] :
    core.value?.openingChoice === 'leave' ? ['擦肩而过', '你保留补给，选择先照顾自己的修行。'] : ['因果未定', '一念之差，皆由你自己决定。']);
function battle(move: Move) { return act({ type: 'BATTLE', move }); }
function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportSave() { if (game.value) download(JSON.stringify(game.value, null, 2), '尘缘问道-存档.json'); }
async function exportRaw() {
  exportError.value = '';
  try { const text = await store.rawText(); if (text) download(text, '尘缘问道-原始数据库备份.json'); else exportError.value = '当前没有可导出的数据库'; }
  catch (e) { exportError.value = e instanceof Error ? e.message : String(e); }
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0];
  if (!file) return;
  if (file.size > MAX_SAVE_BYTES) { store.validationError('存档大于 1 MB，未导入'); input.value = ''; return; }
  if (!game.value || confirm('导入将替换当前进度。建议先导出备份，是否继续？')) await store.importText(await file.text());
  input.value = '';
}
async function reset() {
  if (confirm('重新开始会替换当前进度，确定已导出需要保留的存档？')) {
    await store.restart(core.value?.player.name ?? name.value); if (!store.error) { tab.value = '修行'; settings.value?.close(); }
  }
}
async function restore() {
  if (confirm('回到最近的完整准备检查点，当前进度将被替换，是否继续？')) {
    await store.checkpoint(); if (!store.error) { tab.value = '修行'; settings.value?.close(); }
  }
}
onMounted(() => store.init());
</script>

<template>
  <div class="app-shell" :class="{'large-text': large}" :style="{'--scene': `url(${scene})`}">
    <header class="topbar">
      <div class="brand"><span class="seal">尘<br>缘</span><div><h1>尘缘问道</h1><p>一念尘缘起 · 千山共问道</p></div></div>
      <div v-if="core" class="where"><span class="diamond">◇</span> 云岚州 · {{location.name}} <small>修行第 {{core.world.elapsedMonths}} 月</small></div>
      <div class="top-actions"><span class="save-state" role="status" data-testid="save-status">{{store.saveLabel}}</span><button v-if="game" @click="exportSave" :disabled="store.busy">导出存档</button><button @click="settings?.showModal()">设置</button></div>
    </header>
    <div v-if="!store.ready" class="loading">正在展开仙途……</div>
    <div v-if="store.error" class="error-banner" role="alert" data-testid="error">
      <p>{{store.error}}</p><button v-if="store.canRetry" data-testid="retry" @click="store.retry()" :disabled="store.busy">重试本次操作</button>
      <button v-if="!store.available" data-testid="reload-storage" @click="store.init()" :disabled="store.busy">重新读取</button>
      <button @click="exportRaw" :disabled="store.busy">导出原件备份</button>
    </div>
    <div v-if="store.warning" class="error-banner" role="status">{{store.warning}}</div>
    <div v-if="exportError" class="error-banner" role="alert">{{exportError}}</div>
    <main v-if="store.ready && !game" class="welcome">
      <div class="welcome-art"><span class="eyebrow">尘缘问道 · 试玩版</span><h2>凡心未改，<br>仙途已在眼前。</h2><p>不计片刻，不赶境界。<br>采一味灵草，结一段因果，修属于自己的长生路。</p></div>
      <form class="paper welcome-form" @submit.prevent="store.start(name)">
        <span class="eyebrow">第一章 / 凡心入道</span><h2>从此刻，问道。</h2><label for="name">你的道号</label>
        <input id="name" v-model="name" maxlength="16" required autocomplete="off">
        <p>通过修炼、材料与选择筹备下一步。数值仍在调整，阅读和离线不会消耗寿元。</p>
        <button class="primary" type="submit" :disabled="store.busy || !store.available">踏入仙途 <span>→</span></button>
        <label class="file-button">导入已有存档<input type="file" accept=".json,application/json" @change="importFile" :disabled="store.busy || !store.available"></label>
      </form>
    </main>
    <main v-if="game && core" class="game-grid">
      <aside class="paper character">
        <div class="section-label">道者 · 个人志</div><div class="portrait"><div class="portrait-ring">道</div><span class="portrait-caption">心向长生</span></div>
        <h2>{{core.player.name}}</h2><span class="realm-badge" data-testid="realm">{{realm.name}}</span><p class="small muted">清风为伴，明月同途。</p>
        <div class="stats">
          <div class="stat"><label>气血 <b data-testid="hp">{{core.player.hp}} / {{realm.maxHp}}</b></label><progress class="health" :value="core.player.hp" :max="realm.maxHp" aria-label="气血"></progress></div>
          <div class="stat"><label>灵力 <b>{{core.player.mp}} / {{realm.maxMp}}</b></label><progress :value="core.player.mp" :max="realm.maxMp" aria-label="灵力"></progress></div>
          <div class="stat"><label>修为 <b data-testid="xp">{{core.player.xp}} / {{realm.xpCap}}</b></label><progress class="cultivation" :value="core.player.xp" :max="realm.xpCap || 1" aria-label="修为"></progress></div>
          <div class="stat-pair"><span>年龄 / 寿限</span><b>{{age}} / {{realm.lifespanMonths/12}} 岁</b></div><div class="stat-pair"><span>灵石</span><b class="gold" data-testid="stones">{{core.player.stones}}</b></div>
        </div><div class="divider"></div><h3>当前修法</h3><div class="skill-row"><span class="skill-icon">诀</span><div><strong>{{schoolName}}</strong><small>{{game.loadout.mind ? C.skills[game.loadout.mind].name : '引气入体后选择'}}</small></div></div>
        <p class="small muted">本命法宝 · {{game.loadout.relic ? C.relics[game.loadout.relic].name : '金丹后可炼制装备'}}</p>
      </aside>
      <section class="center-column">
        <div class="scene" :class="{fighting: game.battle}"><div class="scene-vignette"></div><div class="scene-copy">
          <span class="eyebrow">{{phase === 'opening' ? '初遇 / 山雨破庙' : location.subtitle}}</span>
          <h2>{{phase === 'opening' ? '雨中故人' : game.battle ? C.enemies[game.battle.enemy].name : activeStory?.name ?? location.name}}</h2>
          <p>{{game.battle ? '先辨来势，再决进退。' : '山海不言，修行自有回响。'}}</p>
        </div><span class="scene-seal">问<br>道</span></div>
        <div class="paper content-panel">
          <template v-if="phase === 'opening'">
            <div class="section-label">当前遭遇 <span>壹 · 破庙</span></div><h2>一丹，一念。</h2>
            <p class="story">山雨将歇，青衣药修沈清禾向你求药，而你的行囊中只剩一枚回春丹。庙柱上的引气之法人人可习，要不要介入这段因果，由你决定。</p>
            <div class="choices">
              <button v-for="choice in [{id:'help',name:'赠丹相助'},{id:'trade',name:'以丹换简'},{id:'leave',name:'保留丹药'}] as const" :key="choice.id" :data-testid="choice.id" @click="act({type:'CHOOSE',choice:choice.id})" :disabled="!can({type:'CHOOSE',choice:choice.id})">
                <strong>{{choice.name}}</strong><small>{{cost({type:'CHOOSE',choice:choice.id})}}</small><small>{{why({type:'CHOOSE',choice:choice.id})}}</small>
              </button>
            </div>
          </template>
          <template v-else-if="phase === 'trial-question'">
            <div class="section-label">渡劫 · 问心</div><h2>你愿如何面对来路？</h2><p class="story">接纳旧我，稳住心神；或放下旧念，以进攻开路。两条道路皆可向前。</p>
            <div class="choices two"><button data-testid="answer-accept" @click="act({type:'ANSWER_TRIAL',answer:'accept'})" :disabled="!can({type:'ANSWER_TRIAL',answer:'accept'})">接纳旧我 · 承受更稳</button><button data-testid="answer-release" @click="act({type:'ANSWER_TRIAL',answer:'release'})" :disabled="!can({type:'ANSWER_TRIAL',answer:'release'})">放下旧念 · 进攻更强</button></div>
          </template>
          <template v-else-if="activeStory">
            <div class="section-label">当前遭遇 · {{activeStory.npc}}</div><h2 data-testid="event-title">{{activeStory.name}}</h2><p class="story">{{activeStory.body}}</p>
            <div class="choices"><button v-for="option in activeStory.options" :key="option.id" :data-testid="`decide-${option.id}`" @click="act({type:'DECIDE',option:option.id})" :disabled="!can({type:'DECIDE',option:option.id})"><strong>{{option.label}}</strong><small>{{option.detail}}</small><small>{{cost({type:'DECIDE',option:option.id})}}</small><small>{{why({type:'DECIDE',option:option.id})}}</small></button></div>
          </template>
          <template v-else-if="game.battle">
            <div class="section-label">斗法 <span data-testid="round">第 {{game.battle.round+1}} 回合</span></div>
            <div class="enemy-row"><h2>{{C.enemies[game.battle.enemy].name}}</h2><b data-testid="enemy-hp">{{game.battle.hp}} / {{C.enemies[game.battle.enemy].hp}} 气血</b></div>
            <progress class="enemy-health" :value="game.battle.hp" :max="C.enemies[game.battle.enemy].hp" aria-label="敌方气血"></progress>
            <div class="intent" data-testid="intent"><span>敌方意图</span><strong>{{forecast!.name}}</strong><b>预计伤害 {{forecast!.damage}}</b></div>
            <p class="battle-resource">{{game.school === 'sword' ? `剑意 ${game.battle.sword} / 3` : `符印 ${game.battle.marks.length} / 3`}}</p>
            <div class="battle-log" aria-live="polite"><p v-for="(line,index) in game.battle.log" :key="index">{{line}}</p></div>
            <div class="battle-actions"><button v-for="move in ['attack','guard','technique','release'] as const" :key="move" :data-testid="move" @click="battle(move)" :disabled="!can({type:'BATTLE',move})">
              <strong>{{move === 'attack' ? '普通攻击' : move === 'guard' ? '凝神护体' : spells[move]}}</strong><small>{{cost({type:'BATTLE',move})}}</small><small>{{why({type:'BATTLE',move})}}</small>
            </button></div>
            <div class="inline-actions"><button @click="battle('heal')" :disabled="!can({type:'BATTLE',move:'heal'})">回春丹 ×{{core.inventory.healing_pill}}</button><button @click="battle('restore')" :disabled="!can({type:'BATTLE',move:'restore'})">回灵丹 ×{{core.inventory.spirit_pill}}</button><button data-testid="flee" @click="battle('flee')" :disabled="!can({type:'BATTLE',move:'flee'})">撤回洞府</button></div>
          </template>
          <template v-else-if="phase === 'trial-ending'">
            <div class="section-label">天门已开</div><h2>此生，留下些什么？</h2><div class="choices two"><button data-testid="ending-transmit" @click="act({type:'END',ending:'transmit'})" :disabled="!can({type:'END',ending:'transmit'})">将道法留在人间</button><button data-testid="ending-depart" @click="act({type:'END',ending:'depart'})" :disabled="!can({type:'END',ending:'depart'})">挥别故人，独赴上界</button></div>
          </template>
          <template v-else-if="game.status !== 'active'">
            <div class="section-label">此生收卷</div><h2>{{goal?.title}}</h2><ol class="journal"><li v-for="line in life" :key="line">{{line}}</li></ol><button @click="exportSave">导出此生存档</button><button @click="reset" :disabled="store.busy">开启新的人生</button>
          </template>
          <template v-else-if="tab === '修行'">
            <div class="section-label">修行 <span>积跬步，以至千里</span></div><h2>静守灵台，凝气归元。</h2><p class="story">{{location.description}}</p>
            <template v-if="core.world.location === 'cave'">
              <div class="action-options"><label>连续行动 <select v-model.number="batch" aria-label="行动次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option></select></label><small>成本与停止原因按真实行动结算。</small></div>
              <div class="choices"><button data-testid="cultivate" @click="act(natural)" :disabled="!can(natural)"><strong>自然吐纳</strong><small>{{cost(natural)}}</small><small>{{why(natural)}}</small></button><button data-testid="cultivate-assisted" @click="act(assisted)" :disabled="!can(assisted)"><strong>灵石辅助</strong><small>{{cost(assisted)}}</small><small>{{why(assisted)}}</small></button><button data-testid="rest" @click="act({type:'REST'})" :disabled="!can({type:'REST'})"><strong>洞府疗养</strong><small>{{cost({type:'REST'})}}</small><small>{{why({type:'REST'})}}</small></button></div>
            </template>
            <button v-else class="primary" data-testid="return-cave" @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府修行 →</button>
            <div class="breakthrough"><div><strong>{{goal?.title}}</strong><small>{{why(breakthrough) || '准备已经齐全'}}</small></div><button class="primary" data-testid="breakthrough" @click="act(breakthrough)" :disabled="!can(breakthrough)">{{core.player.realm === 'mortal' ? '引气入体' : core.player.realm === 'spirit' ? '开始渡劫' : '确认突破'}}</button></div>
            <div class="school-picker"><h3>选择修法 <small>战斗外切换</small></h3><div class="choices two"><button v-for="school in ['sword','talisman'] as const" :key="school" :data-testid="`school-${school}`" :class="{selected:game.school===school}" @click="act({type:'SCHOOL',school})" :disabled="!can({type:'SCHOOL',school})"><strong>{{school==='sword'?'剑修 · 青锋剑诀':'符修 · 镇灵符诀'}}</strong><small>{{why({type:'SCHOOL',school})}}</small></button></div></div>
          </template>
          <template v-else-if="tab === '历练'">
            <div class="section-label">历练</div><p class="story">{{location.description}}</p>
            <div class="locations"><button v-for="(place,id) in C.locations" :key="id" :data-testid="`travel-${id}`" :class="{selected:core.world.location===id}" @click="travel(id)" :disabled="!can({type:'TRAVEL',location:id})">{{place.name}}<small>{{why({type:'TRAVEL',location:id})}}</small></button></div>
            <div class="source-grid"><button v-for="[id,source] in localSources" :key="id" :data-testid="`source-${id}`" @click="act({type:'SOURCE',sourceId:id})" :disabled="!can({type:'SOURCE',sourceId:id})"><strong>{{source.name}}</strong><small>{{cost({type:'SOURCE',sourceId:id})}}</small><small v-if="source.stones">灵石 +{{source.stones}}</small><small v-for="(n,item) in source.items" :key="item">{{C.items[item].name}} +{{n}}</small><small>{{why({type:'SOURCE',sourceId:id})}}</small></button></div>
            <div v-if="activeEnemies.length" class="encounters"><h3>此地挑战</h3><div class="choices two"><button v-for="[id,enemy] in activeEnemies" :key="id" :data-testid="`encounter-${id}`" @click="act({type:'ENCOUNTER',enemy:id})" :disabled="!can({type:'ENCOUNTER',enemy:id})"><strong>{{enemy.name}}</strong><small>气血 {{enemy.hp}} · 胜利后取得奖励</small><small>{{why({type:'ENCOUNTER',enemy:id})}}</small></button></div></div>
            <div v-if="core.world.location==='market'" class="market"><label>每次采购数量 <input type="number" min="1" max="20" v-model.number="quantity" aria-label="采购数量"></label><div class="market-row" v-for="[id,item] in knownItems" :key="id"><div><strong>{{item.name}}</strong><small>{{item.description}}</small></div><button :data-testid="`buy-${id}`" @click="act({type:'BUY',item:id,quantity})" :disabled="!can({type:'BUY',item:id,quantity}) || quantity>20">购入 · {{cost({type:'BUY',item:id,quantity})}}<small>{{why({type:'BUY',item:id,quantity})}}</small></button></div></div>
          </template>
          <template v-else-if="tab === '行囊'">
            <div class="section-label">行囊 <span>一草一石，皆有其用</span></div><div class="inventory"><article v-for="[id,item] in knownItems" :key="id"><div class="item-glyph">{{item.name.slice(-1)}}</div><div><strong>{{item.name}} <b :data-testid="`item-${id}`">×{{core.inventory[id]}}</b></strong><small>{{item.description}}</small></div><button v-if="item.hp || item.mp" @click="act({type:'USE',item:id})" :disabled="!can({type:'USE',item:id})">服用</button><button v-else-if="item.sell!==null && core.world.location==='market'" @click="act({type:'SELL',item:id,quantity:1})" :disabled="!can({type:'SELL',item:id,quantity:1})">售出 · {{item.sell}}</button></article></div>
            <h3 class="recipes-title">丹炉 · 固定配方</h3><p v-if="core.world.location!=='cave'" class="small">需在洞府炼丹。<button @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">前往洞府</button></p>
            <div class="recipe" v-for="[id,recipe] in localRecipes" :key="id"><div><strong>{{recipe.name}}</strong><small>{{cost({type:'CRAFT',recipeId:id})}}</small><small>{{why({type:'CRAFT',recipeId:id})}}</small></div><button :data-testid="`craft-${id}`" @click="act({type:'CRAFT',recipeId:id})" :disabled="!can({type:'CRAFT',recipeId:id})">炼制</button></div>
          </template>
          <template v-else>
            <div class="section-label">仙缘</div><article class="fate-card"><span class="npc-seal">禾</span><div><h2>山雨之缘</h2><strong class="gold">{{fate[0]}}</strong><p class="story">{{fate[1]}}</p></div></article>
            <div class="choices"><button v-for="event in events" :key="event.id" :data-testid="`event-${event.id}`" @click="act({type:'EVENT',event:event.id})" :disabled="!can({type:'EVENT',event:event.id})">{{event.name}} · {{event.npc}}</button></div>
            <h3>修行手记</h3><ol class="journal"><li v-for="(line,index) in [...game.journal].reverse()" :key="index">{{line}}</li></ol>
          </template>
        </div>
        <div class="feedback paper" aria-live="polite" data-testid="feedback"><span>手记</span><p>{{game.journal.at(-1)}}</p><small v-if="store.lastResult && store.lastResult.requestedSteps>1">实际执行 {{store.lastResult.executedSteps}} / {{store.lastResult.requestedSteps}} 次{{store.lastResult.stopReason ? ' · '+store.lastResult.stopReason.message : ''}}</small></div>
      </section>
      <aside class="right-column"><section class="paper goals"><div class="section-label">当前目标</div><h3 data-testid="target">{{goal?.title}}</h3><p class="small muted">境界来自准备，不来自等待。</p>
        <div v-for="(gap,index) in goal?.deficits" :key="index" class="goal-line"><span>○</span><div>{{gap.kind==='item' && gap.id ? C.items[gap.id].name : gap.kind==='xp'?'修为':gap.kind==='hp'?'气血':gap.kind==='stones'?'灵石':gap.kind==='months'?'可用游戏月':'灵力'}}<small>{{gap.have}} / {{gap.required}} · 尚缺 {{gap.missing}}</small></div></div>
        <p v-if="!goal?.deficits.length" class="small">{{phase==='idle' ? '按当前状态与地点选择下一步。' : '先处理眼前的遭遇。'}}</p>
      </section><section class="paper fate-summary"><div class="section-label">仙缘因果</div><h3>{{fate[0]}}</h3><p class="small">{{fate[1]}}</p><button class="text-button" @click="tab='仙缘'">展开仙缘 →</button></section>
      <section class="note"><span>此地机缘</span><p>{{location.description}}</p><small>试玩版本 · 数值未平衡<br>约30分钟理解玩法，不限定通关时间</small></section></aside>
    </main>
    <nav v-if="game" class="bottom-nav" aria-label="主要页面"><button v-for="(label,index) in ['修行','历练','行囊','仙缘']" :key="label" :data-testid="`tab-${index}`" :class="{active:tab===label}" :aria-current="tab===label?'page':undefined" @click="tab=label"><span class="nav-icon">{{['◈','山','囊','缘'][index]}}</span>{{label}}<small>{{['CULTIVATE','EXPLORE','INVENTORY','KARMA'][index]}}</small></button></nav>
    <dialog ref="settings" class="paper settings"><header><h2>行旅设置</h2><button @click="settings?.close()" aria-label="关闭设置">×</button></header>
      <p>进度仅保存在当前浏览器。导出备份可用于迁移；清理浏览器数据可能丢失进度。</p><label class="setting-row"><span>放大正文</span><input type="checkbox" v-model="large"></label>
      <label class="file-button">导入存档<input data-testid="import" type="file" accept=".json,application/json" @change="importFile" :disabled="store.busy || !store.available"></label>
      <button v-if="game" @click="exportSave">导出当前进度</button><button data-testid="raw-backup" @click="exportRaw" :disabled="store.busy">导出原件备份</button>
      <button v-if="game" data-testid="restore-checkpoint" @click="restore" :disabled="store.busy || !store.available || !store.hasCheckpoint">恢复突破前检查点</button>
      <button v-if="game" class="danger" data-testid="restart" @click="reset" :disabled="store.busy || !store.available">重新开始</button>
    </dialog>
  </div>
</template>
