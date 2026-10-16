<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useGame } from './store';
import { content as C } from '../../src/content/m1.ts';
import { enemies, intent } from '../../src/game/adventure.ts';
import type { GameAction, Move, School } from '../../src/game/adventure.ts';
import type { ItemId, LocationId } from '../../src/game/types.ts';
const store=useGame();const name=ref('顾长青');const tab=ref('修行');const batch=ref(1);const quantity=ref(1);const large=ref(false);const settings=ref<HTMLDialogElement>();
const game=computed(()=>store.game);const core=computed(()=>game.value?.core);const realm=computed(()=>core.value?C.realms[core.value.player.realm]:C.realms.mortal);
const locations:Record<LocationId,{name:string;tag:string;text:string}>={
  wilderness:{name:'云岚山野',tag:'云深不知处 · 一念入仙途',text:'山风穿过松隙，石阶没入云海。灵草依崖生长，远处传来低沉的兽鸣。采药或凝露是稳妥的准备，迎战妖兽则能更快取得妖核。'},
  cave:{name:'听雨洞府',tag:'一盏清茶 · 静听大道',text:'檐下雨声渐歇，石室中的灵气缓缓流转。闭关增长修为，丹炉凝成机缘。此处可以安稳疗养，也可以整理行囊，筹备下一次突破。'},
  sect:{name:'青云宗',tag:'长阶入云 · 道不独行',text:'山门外，执事展开一卷委托。杂务换取灵石，护送取得妖核。初入仙途无需逞强，稳妥的积累同样能够叩开长生之门。'},
  market:{name:'烟霞坊市',tag:'人间烟火 · 亦是修行',text:'玉匣与药香之间，修士们低声议价。这里可以补足材料，也可以直接购入筑基丹。灵石有限，先提升效率，还是先准备突破，由你决定。'}
};
const location=computed(()=>locations[core.value?.world.location??'wilderness']);
const age=computed(()=>core.value?Math.floor((core.value.player.startAgeMonths+core.value.world.elapsedMonths)/12):18);
const locked=computed(()=>store.busy||core.value?.mode==='event'||!!game.value?.battle);
const qi=computed(()=>core.value?.player.realm!=='mortal');
const forecast=computed(()=>game.value?.battle?intent(game.value.battle):null);
const scene=`${import.meta.env.BASE_URL}art/scene.webp`;
const itemIds=Object.keys(C.items) as ItemId[];
const itemNotes:Record<ItemId,string>={herb:'炼丹材料 · 山野采药',dew:'炼丹材料 · 晨间凝露',core:'突破材料 · 迎战 / 护送 / 采购',healing_pill:'恢复 35 气血；战中占一回合',spirit_pill:'恢复 25 灵力；战中占一回合',foundation_pill:'修为圆满后在洞府消耗突破'};
const schoolName=computed(()=>game.value?.school==='sword'?'青锋剑诀':game.value?.school==='talisman'?'镇灵符诀':'尚未择法');
const need=computed(()=>core.value?Math.max(0,realm.value.xpCap-core.value.player.xp):10);
const target=computed(()=>core.value?.mode==='event'?'决定破庙中的相遇':!qi.value?'引气入体':core.value?.player.realm==='foundation'?'筑基已成 · 本阶段完成':'筹备筑基');
const fate=computed(()=>core.value?.openingChoice==='help'?['赠药之缘','你用一枚回春丹救下沈清禾。这段相助已记入仙缘，后续回响尚待扩展。']:core.value?.openingChoice==='trade'?['两清之约','以丹换剑简。惊鸿斩额外造成 4 点伤害，恩义两清。']:['擦肩而过','你保留了回春丹。未结下这段相助关系，也不影响正常突破。']);
const spells=computed(()=>game.value?.school==='talisman'?['镇灵符 · 灵力 8','燃符诀 · 灵力 10']:['青锋起势 · 灵力 8','惊鸿斩 · 灵力 12']);
function act(a:GameAction){return store.act(a);}
async function travel(id:LocationId){await act({type:'TRAVEL',location:id});if(!store.error)tab.value=id==='cave'?'修行':'历练';}
function recipeCost(id:string){const r=C.recipes[id];return Object.entries(r.inputs).map(([k,n])=>`${C.items[k as ItemId].name} ×${n}`).join(' · ')+` · 灵石 ${r.stones}`;}
function canCraft(id:string){const r=C.recipes[id],s=core.value;return !!s&&qi.value&&s.world.location==='cave'&&s.player.stones>=r.stones&&Object.entries(r.inputs).every(([k,n])=>s.inventory[k as ItemId]>=n)&&!locked.value;}
function canBuy(id:ItemId){return !!core.value&&!locked.value&&(qi.value||C.items[id].minRealm==='mortal')&&core.value.player.stones>=C.items[id].buy*quantity.value;}
function battle(move:Move){return act({type:'BATTLE',move});}
function school(s:School){return act({type:'SCHOOL',school:s});}
function exportSave(){if(!game.value)return;const blob=new Blob([JSON.stringify(game.value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='尘缘问道-存档.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function importFile(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;if(file.size>1000000){store.error='存档大于 1 MB，未导入。';input.value='';return;}if(!game.value||confirm('导入将替换当前进度。建议先导出备份，是否继续？'))await store.importText(await file.text());input.value='';}
async function reset(){if(confirm('重新开始会替换当前进度，确定已导出需要保留的存档？')){await store.restart(core.value?.player.name??'顾长青');tab.value='修行';settings.value?.close();}}
async function restore(){if(confirm('回到最近一次突破前，当前进度将被替换，是否继续？'))await store.checkpoint();}
onMounted(()=>store.init());
</script>

<template>
  <div class="app-shell" :class="{'large-text':large}" :style="{'--scene':`url(${scene})`}">
    <header class="topbar">
      <div class="brand"><span class="seal">尘<br>缘</span><div><h1>尘缘问道</h1><p>一念尘缘起 · 千山共问道</p></div></div>
      <div class="where" v-if="game"><span class="diamond">◇</span> 云岚州 · {{location.name}} <small>修行第 {{core!.world.elapsedMonths}} 月</small></div>
      <div class="top-actions"><span class="save-state" role="status">{{store.busy?'正在保存…':store.saved?'● 进度已保存':'本地存档'}}</span><button v-if="game" @click="exportSave" :disabled="store.busy">导出存档</button><button @click="settings?.showModal()">设置</button></div>
    </header>
    <div v-if="!store.ready" class="loading">正在展开仙途……</div>
    <div v-if="store.error" class="error-banner" role="alert" data-testid="error">{{store.error}} <button @click="store.error=''" aria-label="关闭提示">×</button></div>
    <main v-if="store.ready&&!game" class="welcome">
      <div class="welcome-art"><span class="eyebrow">尘缘问道 · 可玩原型</span><h2>凡心未改，<br>仙途已在眼前。</h2><p>不计片刻，不赶境界。<br>采一味灵草，结一段因果，修属于自己的长生路。</p></div>
      <form class="paper welcome-form" @submit.prevent="store.start(name)"><span class="eyebrow">第一章 / 凡心入道</span><h2>从此刻，问道。</h2><label for="name">你的道号</label><input id="name" v-model="name" maxlength="16" required autocomplete="off"><p>本次测试开放凡人至筑基，以及剑修、符修战斗。后续境界尚未开放；当前数值未经平衡。</p><button class="primary" type="submit" :disabled="store.busy">踏入仙途 <span>→</span></button><label class="file-button">导入已有存档<input type="file" accept=".json,application/json" @change="importFile" :disabled="store.busy"></label><small>阅读与离线不消耗寿元。行动中的年月立即结算，不要求现实等待。</small></form>
    </main>
    <main v-if="game&&core" class="game-grid">
      <aside class="paper character">
        <div class="section-label">道者 · 个人志</div><div class="portrait"><div class="portrait-ring">道</div><span class="portrait-caption">心向长生</span></div>
        <h2>{{core.player.name}}</h2><span class="realm-badge" data-testid="realm">{{realm.name}}</span><p class="small muted">清风为伴，明月同途。</p>
        <div class="stats">
          <div class="stat"><label>气血 <b data-testid="hp">{{core.player.hp}} / {{realm.maxHp}}</b></label><progress class="health" :value="core.player.hp" :max="realm.maxHp" aria-label="气血"></progress></div>
          <div class="stat"><label>灵力 <b>{{core.player.mp}} / {{realm.maxMp}}</b></label><progress :value="core.player.mp" :max="realm.maxMp" aria-label="灵力"></progress></div>
          <div class="stat"><label>修为 <b data-testid="xp">{{core.player.xp}} / {{realm.xpCap}}</b></label><progress class="cultivation" :value="core.player.xp" :max="realm.xpCap" aria-label="修为"></progress></div>
          <div class="stat-pair"><span>年龄 / 寿限</span><b>{{age}} / {{realm.lifespanMonths/12}} 岁</b></div><div class="stat-pair"><span>灵石</span><b class="gold" data-testid="stones">{{core.player.stones}}</b></div>
        </div><div class="divider"></div><h3>当前修法 <span>◇</span></h3><div class="skill-row"><span class="skill-icon">诀</span><div><strong>{{schoolName}}</strong><small>{{game.school?'主修 · 可在战斗外免费切换':'引气入体后开放'}}</small></div></div><p class="small" v-if="game.school">{{game.school==='sword'?'剑意上限三层，满层惊鸿可断重击。':'符印持续二回合，引爆结算剩余伤害。'}}</p><p class="small muted">本命法宝 · 金丹后开放<br>当前工程不含金丹玩法</p>
      </aside>
      <section class="center-column">
        <div class="scene" :class="{fighting:game.battle}"><div class="scene-vignette"></div><div class="scene-copy"><span class="eyebrow">{{core.mode==='event'?'初遇 / 山雨破庙':location.tag}}</span><h2>{{core.mode==='event'?'雨中故人':game.battle?enemies[game.battle.enemy].name:location.name}}</h2><p>{{game.battle?'先辨来势，再决进退。':'山海不言，修行自有回响。'}}</p></div><span class="scene-seal">问<br>道</span></div>
        <div class="paper content-panel">
          <template v-if="core.mode==='event'">
            <div class="section-label">当前遭遇 <span>壹 · 破庙</span></div><h2>一丹，一念。</h2><p class="story">山雨将歇，破庙中响起了第二个人的呼吸。青衣药修沈清禾倚在残柱旁，掌心攥着一枚玉简。她向你求药，而你的行囊中，只剩一枚回春丹。</p><p class="story">庙柱上刻着人人可习的引气之法。要不要介入这段因果，由你决定。</p>
            <div class="choices"><button data-testid="help" @click="act({type:'CHOOSE',choice:'help'})" :disabled="store.busy"><strong>赠丹相助</strong><small>回春丹 −1 · 结下赠药之缘</small></button><button data-testid="trade" @click="act({type:'CHOOSE',choice:'trade'})" :disabled="store.busy"><strong>以丹换简</strong><small>回春丹 −1 · 惊鸿斩伤害 +4</small></button><button data-testid="leave" @click="act({type:'CHOOSE',choice:'leave'})" :disabled="store.busy"><strong>保留丹药</strong><small>保留当前补给 · 不结此缘</small></button></div>
          </template>
          <template v-else-if="game.battle">
            <div class="section-label">斗法 <span data-testid="round">第 {{game.battle.round+1}} 回合</span></div><div class="enemy-row"><h2>{{enemies[game.battle.enemy].name}}</h2><b data-testid="enemy-hp">{{game.battle.hp}} / {{enemies[game.battle.enemy].hp}} 气血</b></div><progress class="enemy-health" :value="game.battle.hp" :max="enemies[game.battle.enemy].hp" aria-label="敌方气血"></progress>
            <div class="intent" data-testid="intent"><span>敌方意图</span><strong>{{forecast!.name}}</strong><b>预计伤害 {{forecast!.damage}}</b></div><p class="battle-resource">{{game.school==='sword'?`剑意 ${game.battle.sword} / 3`:`符印 ${game.battle.marks.length} / 3`}} <span>普通攻击回灵 6，护体回灵 5；使用丹药占回合。</span></p>
            <div class="battle-log" aria-live="polite"><p v-for="(line,index) in game.battle.log" :key="index">{{line}}</p><p v-if="!game.battle.log.length">敌人正在试探。你的第一手，将决定接下来的节奏。</p></div>
            <div class="battle-actions"><button data-testid="attack" @click="battle('attack')" :disabled="store.busy">普通攻击<small>13 基础伤害 · 回灵</small></button><button data-testid="guard" @click="battle('guard')" :disabled="store.busy">凝神护体<small>减伤 24 · 回灵</small></button><button data-testid="technique" @click="battle('technique')" :disabled="store.busy||core.player.mp<8">{{spells[0]}}<small>{{game.school==='sword'?'造成伤害，剑意 +2':'符印灼伤，减伤 12'}}</small></button><button data-testid="release" @click="battle('release')" :disabled="store.busy||core.player.mp<(game.school==='sword'?12:10)||(game.school==='sword'?!game.battle.sword:!game.battle.marks.length)">{{spells[1]}}<small>{{game.school==='sword'?'消耗剑意，择机爆发':'引爆全部剩余符印'}}</small></button></div>
            <div class="inline-actions"><button @click="battle('heal')" :disabled="store.busy||!core.inventory.healing_pill">回春丹 ×{{core.inventory.healing_pill}}</button><button @click="battle('restore')" :disabled="store.busy||!core.inventory.spirit_pill">回灵丹 ×{{core.inventory.spirit_pill}}</button><button data-testid="flee" @click="battle('flee')" :disabled="store.busy">撤回洞府 · 气血 −8</button></div>
          </template>
          <template v-else-if="tab==='修行'">
            <div class="section-label">修行 <span>积跬步，以至千里</span></div><h2>{{core.player.realm==='foundation'?'筑基已成，道途未尽。':'静守灵台，凝气归元。'}}</h2><p class="story">{{core.player.realm==='foundation'?'本阶段测试流程已完成。你仍可整理行囊、比较两种修法与战斗；金丹、人物回响和飞升会在后续实现。这里不会显示虚假的飞升按钮。':location.text}}</p>
            <template v-if="core.world.location==='cave'"><div class="action-options"><label>连续行动 <select v-model.number="batch" aria-label="行动次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option></select></label><small>遇修为上限或灵石不足自动停下。</small></div><div class="choices"><button data-testid="cultivate" @click="act({type:'CULTIVATE',method:'natural',count:batch})" :disabled="locked||need===0"><strong>自然吐纳</strong><small>每次修为 +{{realm.baseYield}} · 1 游戏月</small></button><button @click="act({type:'CULTIVATE',method:'assisted',count:batch})" :disabled="locked||!qi||need===0||core.player.stones<20"><strong>灵石辅助</strong><small>每次灵石 −20 · 修为 +{{realm.baseYield*2}}</small></button><button data-testid="rest" @click="act({type:'REST'})" :disabled="locked||(core.player.hp===realm.maxHp&&core.player.mp===realm.maxMp)"><strong>洞府疗养</strong><small>恢复气血灵力 · 免费 · 1 游戏月</small></button></div>
            <div class="breakthrough"><div><strong>下一关 · {{!qi?'引气入体':core.player.realm==='qi'?'筑基':'后续内容未开放'}}</strong><small>{{need?`尚缺修为 ${need}`:'修为已圆满'}}{{core.player.realm==='qi'?` · 筑基丹 ${core.inventory.foundation_pill}/1`:''}}</small></div><button class="primary" data-testid="breakthrough" @click="act({type:'BREAKTHROUGH'})" :disabled="locked||need>0||core.player.realm==='foundation'||(qi&&!core.inventory.foundation_pill)">{{!qi?'引气入体':'确认突破'}}</button></div></template>
            <button v-else class="primary" data-testid="return-cave" @click="travel('cave')" :disabled="locked">返回洞府修行 →</button>
            <div v-if="qi" class="school-picker"><h3>选择修法 <small>战斗外免费切换；没有洗点消耗</small></h3><div class="choices two"><button data-testid="school-sword" :class="{selected:game.school==='sword'}" @click="school('sword')" :disabled="locked||game.school==='sword'"><strong>剑修 · 青锋剑诀</strong><small>剑意积累 → 惊鸿爆发</small></button><button data-testid="school-talisman" :class="{selected:game.school==='talisman'}" @click="school('talisman')" :disabled="locked||game.school==='talisman'"><strong>符修 · 镇灵符诀</strong><small>符印灼伤 → 择机引爆</small></button></div></div>
          </template>
          <template v-else-if="tab==='历练'">
            <div class="section-label">历练 <span>出入山海，亦修吾身</span></div><p class="story">{{location.text}}</p>
            <div class="locations"><button v-for="(place,id) in locations" :key="id" :data-testid="`travel-${id}`" :class="{selected:core.world.location===id}" @click="travel(id)" :disabled="locked||core.world.location===id">{{place.name}}</button></div>
            <div v-if="core.world.location!=='market'" class="source-grid"><template v-for="(source,id) in C.sources" :key="id"><button v-if="source.location===core.world.location" :data-testid="`source-${id}`" @click="act({type:'SOURCE',sourceId:String(id)})" :disabled="locked||!qi"><strong>{{source.name}}</strong><small>{{source.months}} 游戏月{{source.stones?` · 灵石 +${source.stones}`:''}}{{source.xp?` · 修为 +${source.xp}`:''}}</small><small v-for="(n,item) in source.items" :key="item">{{C.items[item].name}} +{{n}}</small></button></template></div>
            <div v-if="core.world.location==='wilderness'" class="encounters"><h3>山野试锋 <small>固定战利品，不依赖稀有掉落</small></h3><div class="choices two"><button v-for="(enemy,id) in enemies" :key="id" :data-testid="`encounter-${id}`" @click="act({type:'ENCOUNTER',enemy:id})" :disabled="locked||!game.school||core.player.hp<30"><strong>{{enemy.name}}</strong><small>气血 {{enemy.hp}} · 胜利获得妖核 ×1</small><small>灵石 +{{enemy.stones}} · 修为 +{{enemy.xp}}</small></button></div><p class="small muted">{{!game.school?'先在修行页选择修法。':'至少 30 气血可出战；失败回洞府，功法与物品保留。'}}</p></div>
            <div v-if="core.world.location==='market'" class="market"><label>每次采购数量 <input type="number" min="1" max="20" v-model.number="quantity" aria-label="采购数量"></label><div class="market-row" v-for="id in itemIds" :key="id"><div><strong>{{C.items[id].name}}</strong><small>{{itemNotes[id]}}</small></div><button :data-testid="`buy-${id}`" @click="act({type:'BUY',item:id,quantity})" :disabled="!canBuy(id)||!Number.isInteger(quantity)||quantity<1||quantity>20">购入 · {{C.items[id].buy}} 灵石/个</button></div></div>
          </template>
          <template v-else-if="tab==='行囊'">
            <div class="section-label">行囊 <span>一草一石，皆有其用</span></div><div class="inventory"><article v-for="id in itemIds" :key="id"><div class="item-glyph">{{C.items[id].name.slice(-1)}}</div><div><strong>{{C.items[id].name}} <b :data-testid="`item-${id}`">×{{core.inventory[id]}}</b></strong><small>{{itemNotes[id]}}</small></div><button v-if="C.items[id].healHp||C.items[id].healMp" @click="act({type:'USE',item:id})" :disabled="locked||!core.inventory[id]">服用</button><button v-else-if="C.items[id].sell!==null&&core.world.location==='market'" @click="act({type:'SELL',item:id,quantity:1})" :disabled="locked||!core.inventory[id]">售出 · {{C.items[id].sell}}</button></article></div>
            <h3 class="recipes-title">丹炉 · 固定配方 <small>材料足够必定炼成，无失败重刷</small></h3><p v-if="core.world.location!=='cave'" class="small">需在洞府炼丹。<button @click="travel('cave')" :disabled="locked">前往洞府</button></p><div class="recipe" v-for="(recipe,id) in C.recipes" :key="id"><div><strong>{{recipe.name}}</strong><small>{{recipeCost(String(id))}} · {{recipe.months}} 游戏月</small></div><button :data-testid="`craft-${id}`" @click="act({type:'CRAFT',recipeId:String(id)})" :disabled="!canCraft(String(id))">炼制</button></div>
          </template>
          <template v-else>
            <div class="section-label">仙缘 <span>有所遇，才有所念</span></div><article class="fate-card"><span class="npc-seal">禾</span><div><h2>沈清禾 <small>山间药修</small></h2><strong class="gold">{{fate[0]}}</strong><p class="story">{{fate[1]}}</p></div></article><h3>修行手记 <small>最近 60 条 · 含物品与规则反馈</small></h3><ol class="journal"><li v-for="(line,index) in [...game.journal].reverse()" :key="index">{{line}}</li></ol>
          </template>
        </div>
        <div class="feedback paper" aria-live="polite" data-testid="feedback"><span>手记</span><p>{{game.journal[game.journal.length-1]}}</p></div>
      </section>
      <aside class="right-column"><section class="paper goals"><div class="section-label">当前目标 <span>壹</span></div><h3 data-testid="target">{{target}}</h3><p class="small muted">境界来自准备，不来自等待。</p><template v-if="core.mode==='idle'&&core.player.realm!=='foundation'"><div class="goal-line"><span :class="{done:need===0}">{{need===0?'✓':'○'}}</span><div>修为圆满<small>{{core.player.xp}} / {{realm.xpCap}}</small></div></div><div v-if="qi" class="goal-line"><span :class="{done:core.inventory.foundation_pill>0}">{{core.inventory.foundation_pill?'✓':'○'}}</span><div>筑基丹 ×1<small>自行炼制，或坊市采购</small></div></div><div v-if="qi" class="mini-recipe"><div v-for="(n,id) in C.recipes.foundation.inputs" :key="id">{{C.items[id].name}}<b>{{core.inventory[id]}} / {{n}}</b></div><div>炼丹费<b>20 灵石</b></div></div><button class="full" @click="travel(need?'cave':'market')" :disabled="locked||core.world.location===(need?'cave':'market')">{{need?'前往洞府':'前往坊市'}} →</button></template><p v-else class="small">{{core.mode==='event'?'先回应眼前的相遇。所有选择都能继续求道。':'可继续测试战斗与存档。后续境界未实现。'}}</p></section><section class="paper fate-summary"><div class="section-label">仙缘因果</div><h3>{{core.openingChoice?fate[0]:'因果尚未落定'}}</h3><p class="small">{{core.openingChoice?fate[1]:'一念善缘，一纸契约，或一次擦肩。'}}</p><button class="text-button" @click="tab='仙缘'">展开仙缘 →</button></section><section class="note"><span>此地机缘</span><p>{{core.world.location==='sect'?'护送委托能稳定取得妖核，不必独自冒险。':core.world.location==='market'?'没有灵石时，可回宗门做杂务，不会陷入资源死局。':'山海有路，进退有度。洞府疗养不消耗灵石。'}}</p><small>M1 可玩测试 · 数值未平衡<br>约 30 分钟理解玩法，不限定通关时间</small></section></aside>
    </main>
    <nav v-if="game" class="bottom-nav" aria-label="主要页面"><button v-for="(label,index) in ['修行','历练','行囊','仙缘']" :key="label" :data-testid="`tab-${index}`" :class="{active:tab===label}" :aria-current="tab===label?'page':undefined" @click="tab=label"><span class="nav-icon">{{['◈','山','囊','缘'][index]}}</span>{{label}}<small>{{['CULTIVATE','EXPLORE','INVENTORY','KARMA'][index]}}</small></button></nav>
    <dialog ref="settings" class="paper settings"><header><h2>行旅设置</h2><button @click="settings?.close()" aria-label="关闭设置">×</button></header><p>所有进度仅保存在当前浏览器。定期导出备份，清理浏览器数据可能丢失本地存档。</p><label class="setting-row"><span>放大正文</span><input type="checkbox" v-model="large"></label><label class="file-button">导入存档<input data-testid="import" type="file" accept=".json,application/json" @change="importFile" :disabled="store.busy"></label><button v-if="game" @click="exportSave">导出当前进度</button><button v-if="game" @click="restore" :disabled="store.busy">恢复突破前检查点</button><button v-if="game" class="danger" data-testid="restart" @click="reset" :disabled="store.busy">重新开始</button><small>当前阶段：凡人 → 炼气 → 筑基。<br>剑符战斗与存档可测试，非完整飞升 Demo。</small></dialog>
  </div>
</template>
