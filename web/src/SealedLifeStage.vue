<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import {getLifeRecord} from '../../src/full/queries';
import './sealed-life.css';
const props=defineProps<{game:Game;busy:boolean;receipt:boolean}>();
const emit=defineEmits<{life:[MouseEvent];export:[];settings:[MouseEvent];receipt:[]}>();
const record=computed(()=>getLifeRecord(props.game)),mark=computed(()=>props.game.status==='ascended'?(props.game.ending==='transmit'?'传道':'离尘'):props.game.ending==='retired'?'归隐':props.game.ending==='lifespan'?'寿尽':'收卷');
</script>
<template>
 <section class="sealed-life-stage" data-testid="sealed-life-stage" :data-ending="game.ending">
  <button class="sealed-life-book" data-testid="sealed-open-life" aria-label="查看生平与收卷" @click="emit('life',$event)"><span class="sealed-book-spine" aria-hidden="true"/><span class="sealed-book-title" aria-hidden="true">尘缘<br>问道</span><strong data-testid="sealed-mark" class="sealed-book-mark" aria-hidden="true">{{mark}}</strong><span class="sealed-book-open">查看生平与收卷 <b aria-hidden="true">›</b></span></button>
  <div class="sealed-life-copy"><small class="sealed-life-eyebrow">此卷已收 · 来路犹存</small><h1 data-testid="sealed-title">{{record.overview.title}}</h1><p class="sealed-life-identity">{{record.overview.name}} · {{record.overview.ageLabel}} · {{record.overview.realmName}} · 行道 {{record.overview.elapsedMonths}} 游戏月</p><p data-testid="sealed-conclusion">{{record.overview.conclusion}}</p><p class="sealed-life-note">翻卷只阅读，不推进年月。恢复准备或开始新人生，均需另外核对与确认。</p>
   <div class="sealed-life-tools"><button data-testid="sealed-export" :disabled="busy" @click="emit('export')">导出完整进度</button><button v-if="receipt" data-testid="sealed-receipt" @click="emit('receipt')">重读收卷经过</button><button data-testid="sealed-manage" @click="emit('settings',$event)">存档与恢复</button></div>
  </div>
 </section>
</template>
