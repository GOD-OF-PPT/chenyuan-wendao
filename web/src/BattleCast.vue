<script setup lang="ts">
import {computed} from 'vue';
import type {ActionNotice} from './action-feedback';
import {castForNotice} from './battle-choreography';
import './ta07-cast.css';
const props=defineProps<{notice:ActionNotice}>();
const cast=computed(()=>castForNotice(props.notice));
</script>
<template>
 <div v-if="cast" class="battle-cast" :class="'cast-'+cast.shape" data-testid="battle-cast" :data-move="cast.move" :data-school="cast.school" :data-shape="cast.shape" :data-receipt="notice.key" aria-hidden="true">
  <svg viewBox="0 0 160 160" class="cast-drawing">
   <g v-if="cast.move==='attack'" class="cast-thrust"><path d="M21 105L133 55L102 87L21 105Z"/><path class="cast-thread" d="M20 116L115 83"/></g>
   <g v-else-if="cast.move==='guard'" class="cast-ward"><path d="M80 19L129 46L123 105Q112 131 80 143Q48 131 37 105L31 46Z"/><path class="cast-thread" d="M80 31L113 53L109 99Q102 118 80 129Q58 118 51 99L47 53Z"/></g>
   <g v-else-if="cast.move==='technique'" class="cast-gather"><template v-if="cast.school==='sword'"><path d="M30 135L80 22L83 99ZM61 138L118 35L103 112Z"/><path class="cast-thread" d="M22 124Q8 80 49 44M112 132Q151 95 133 50"/></template><template v-else><path d="M51 23L112 36L100 140L39 125Z"/><path class="cast-thread" d="M64 48L91 52L66 77L91 80L61 109M52 64L102 72"/></template></g>
   <g v-else-if="cast.move==='release'" class="cast-burst"><template v-if="cast.school==='sword'"><path d="M16 128Q51 37 145 19Q94 55 78 79Q55 106 16 128Z"/><path class="cast-thread" d="M22 142Q84 111 141 49"/></template><template v-else><path d="M80 18L105 55L145 80L105 105L80 144L55 105L15 80L55 55Z"/><path class="cast-thread" d="M34 34L126 126M126 34L34 126M80 14V145M14 80H146"/></template></g>
   <g v-else-if="cast.move==='heal'" class="cast-elixir"><path d="M54 96Q80 116 106 96L99 121H61Z"/><path class="cast-orb" d="M80 29C100 51 101 73 80 84C59 73 60 51 80 29Z"/><path class="cast-thread" d="M35 116Q18 65 56 45M123 115Q143 77 115 54"/></g>
   <g v-else-if="cast.move==='restore'" class="cast-spirit"><path class="cast-thread" d="M20 108C127 154 150 37 66 44C19 49 41 110 106 91M50 19C20 33 20 70 45 83M136 125Q116 147 90 137"/><path d="M80 33L98 73L80 111L62 73Z"/></g>
   <g v-else class="cast-withdraw"><path d="M113 31L45 79L113 126L91 80Z"/><path class="cast-thread" d="M139 43L101 79L140 114"/></g>
  </svg>
  <i class="cast-impact"/><i class="cast-dust"/>
 </div>
</template>
