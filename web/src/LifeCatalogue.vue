<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Game} from '../../src/full/types.ts';
import {getLifeRecord,previewAction} from '../../src/full/queries.ts';
import {lifeReadings,readingPages} from './story-pages';
import {pageSlice} from './play-flow';
import CataloguePager from './CataloguePager.vue';
import AssetImage from './AssetImage.vue';
import {sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;hasCheckpoint:boolean}>(),emit=defineEmits<{end:['RETIRE'|'END_LIFE'];export:[];restore:[];restart:[]}>();
const mode=ref('life'),page=ref(0),record=computed(()=>getLifeRecord(props.game));
const scene=computed(()=>scenePresentation(props.game));
const rows=computed(()=>readingPages(lifeReadings(props.game).filter(r=>r.group===mode.value))),paged=computed(()=>pageSlice(rows.value,page.value,1));
function select(value:string){mode.value=value;page.value=0;}
watch(()=>props.game.core.runId,()=>select('life'));
</script>
<template>
 <section class="paper play-catalogue story-book life-book" data-testid="life-panel" tabindex="-1"><header><div><small>修仙生平 · {{game.status==='active'?'此生仍在继续':'此生收卷'}}</small><h2 data-testid="life-title" tabindex="-1">{{record.overview.title}}</h2></div><button data-testid="export-life" @click="emit('export')">导出生平</button></header>
  <nav class="catalogue-tabs" aria-label="生平篇章"><button v-for="[id,label] in [['life','来路'],['training','修行'],['decisions','因果'],['seal','收卷']]" :key="id" :data-testid="'life-mode-'+id" :aria-pressed="mode===id" @click="select(id)">{{label}}</button></nav>
  <div class="book-canvas book-landscape" :data-gate="scene.gate"><AssetImage class="book-scenery" :path="sceneAssetPath(scene)" :asset-id="'reading-scene-'+scene.artKey"/><article v-for="row in paged.rows" :key="row.key+row.part" class="reading-text life-reading" :data-page-key="row.key"><small>{{row.title}}<span v-if="row.parts>1"> · {{row.part}} / {{row.parts}}</span></small><p :data-testid="row.testId">{{row.text}}</p></article><aside class="book-caption" aria-label="生平题记"><span>{{record.overview.name}}</span><small>{{record.overview.realmName}} · {{record.overview.ageLabel}}</small></aside></div>
  <CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="生平" @change="page=$event"/>
  <footer v-if="mode==='seal'" class="life-actions story-footer"><template v-if="game.status==='active'"><button data-testid="retire" @click="emit('end','RETIRE')" :disabled="!enabled||busy||!previewAction(game,{type:'RETIRE'}).allowed">主动归隐</button><button v-if="record.overview.remainingMonths===1" data-testid="end-life" @click="emit('end','END_LIFE')" :disabled="!enabled||busy||!previewAction(game,{type:'END_LIFE'}).allowed">度过最后1游戏月并收卷</button><small>查看不结束人生，归隐与寿尽需要另行核对。</small></template><template v-else><button data-testid="life-restore" @click="emit('restore')" :disabled="!enabled||busy||!hasCheckpoint">恢复完整准备</button><button data-testid="life-restart" @click="emit('restart')" :disabled="!enabled||busy">新的人生</button><small>{{hasCheckpoint?'恢复将一同回退物品、年月与人物记录。':'此档没有检查点，不能补造准备快照。'}}</small></template></footer>
  <footer v-else class="story-footer"><small>只展示已有事实，阅读不消耗游戏月。</small><button @click="select('seal')">查看收卷与恢复 →</button></footer>
 </section>
</template>
