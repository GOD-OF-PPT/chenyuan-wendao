<script setup lang="ts">
import { computed, useId } from 'vue';
import * as C from '../../src/full/content';
import {
  COMMISSION_OBJECTS,
  COMMISSION_WORK,
  projectSourceWork,
} from './source-choreography';
import './ta08-source.css';
import SourceMaterials from './SourceMaterials.vue';
const props = defineProps<{
  sourceId: string;
  state: string;
  progress: number;
  sequence: number;
}>();
const emit = defineEmits<{ arrange: [] }>();
const instance = useId(),
  paint = (material: string) =>
    `ta08-task-${props.sourceId}-${instance}-${material}`;
const materials = computed(() =>
  Object.fromEntries(
    ['wood', 'paper', 'bronze', 'jade', 'stone', 'fiber'].map((name) => [
      '--ta08-' + name + '-fill',
      `url(#${paint('material-' + name)})`,
    ]),
  ),
);
const visual = computed(() => projectSourceWork(props.state, props.progress));
const object = computed(
  () => COMMISSION_OBJECTS[props.sourceId as keyof typeof COMMISSION_OBJECTS],
);
const source = computed(() => C.sources[props.sourceId]);
const arrival = computed(
  () =>
    props.sequence > 0 &&
    !['failed', 'inactive', 'paused', 'pausing'].includes(props.state),
);
</script>
<template>
  <section
    class="ta08-commission-object"
    data-testid="source-commission-object"
    :data-source="sourceId"
    :data-object="object"
    :data-state="state"
    :data-phase="visual.phase"
    :data-working="visual.working"
    :data-progress="visual.progress"
    :data-sequence="sequence"
    :style="{
      ...materials,
      '--source-approach': visual.approach + 'px',
      '--source-turn': visual.turn + 'deg',
      '--source-draw': visual.draw,
      '--source-fold': visual.fold,
    }"
  >
    <button
      type="button"
      class="ta08-task-view"
      data-testid="source-object-arrange"
      :aria-label="
        (source?.name ?? '宗门差事') + '，查看并调整本段安排，不立即承办'
      "
      @click="emit('arrange')"
    >
      <span class="ta08-task-table" aria-hidden="true" />
      <svg
        class="ta08-task-drawing"
        viewBox="0 0 320 240"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <SourceMaterials :prefix="paint('material')" />
        <g :filter="'url(#' + paint('material-surface') + ')'">
          <g v-if="object === 'sweep'" class="ta08-task-body task-sweep">
            <path
              d="M78 177Q105 162 137 177L130 202H85ZM83 182H132"
              class="ta08-task-bronze"
            />
            <path
              d="M121 181L134 180L130 202H112Z"
              fill="#173b33"
              fill-opacity=".45"
              stroke-opacity=".3"
            />
            <ellipse
              cx="107"
              cy="177"
              rx="28"
              ry="6"
              fill="#163a33"
              stroke-opacity=".7"
            />
            <path d="M107 174Q112 139 100 127Q84 123 87 143Q93 154 109 152" />
            <g class="ta08-task-tool">
              <path
                d="M216 43L188 139L179 136L207 41Z"
                class="ta08-tool-wood"
              />
              <path
                d="M180 132Q155 153 143 196Q179 212 210 194L188 135Z"
                class="ta08-tool-fiber"
              />
              <path d="M176 147L158 195M184 148L178 201M191 148L198 196" />
            </g>
            <path
              d="M60 213H248M222 196L226 189M233 202L239 195"
              class="ta08-task-grain"
            />
          </g>
          <g v-else-if="object === 'escort'" class="ta08-task-body task-escort">
            <path
              d="M70 151L130 132L185 151V202L126 218L70 197Z"
              class="ta08-task-wood"
            />
            <path
              d="M70 151L126 168L185 151M126 168V218M96 143L154 160M155 142L97 160M96 160V206M154 160V209"
            />
            <path
              d="M126 168L185 151V202L126 218Z"
              fill="#112e2c"
              fill-opacity=".35"
              stroke-opacity=".35"
            />
            <path
              d="M79 171L116 181M80 184L115 194M139 184L174 174"
              class="ta08-task-grain"
            />
            <path d="M161 59L236 67L226 144L151 134Z" class="ta08-task-paper" />
            <path
              d="M174 81L216 85M170 95L210 99M169 111L197 115"
              class="ta08-task-grain"
            />
            <g class="ta08-task-tool">
              <path
                d="M211 141Q190 158 168 147Q160 132 177 129Q196 128 211 141Q214 164 194 169Q181 164 195 151Z"
                class="ta08-task-cord"
              />
            </g>
          </g>
          <g v-else-if="object === 'survey'" class="ta08-task-body task-survey">
            <path
              d="M49 83L118 65L177 82L252 61L267 177L192 201L125 182L61 201Z"
              class="ta08-task-paper"
            />
            <path
              d="M118 65L125 182M177 82L192 201M78 157L106 123L139 146L166 107L198 137L231 97M80 173L111 159L141 175L187 151L232 166"
              class="ta08-task-grain"
            />
            <path
              d="M177 82L190 84L204 197L192 201Z"
              fill="#284e41"
              fill-opacity=".4"
              stroke-opacity=".2"
            />
            <g class="ta08-task-tool">
              <path
                d="M143 46L116 150L153 109L190 159L162 46Z"
                class="ta08-task-bronze"
              />
              <path d="M143 46H162M151 59L153 109" />
            </g>
          </g>
          <g v-else-if="object === 'array'" class="ta08-task-body task-array">
            <path
              d="M62 182L158 122L259 184L161 225Z"
              class="ta08-task-stone"
            />
            <path
              d="M94 181L159 143L226 184L161 210ZM161 143V210M94 181L226 184"
              class="ta08-task-inlay"
            />
            <path
              d="M62 182L161 214L259 184L161 225Z"
              fill="#102f2c"
              fill-opacity=".6"
              stroke-opacity=".3"
            />
            <path
              d="M83 110L100 104L113 116V174L98 183L83 171ZM211 109L227 102L240 114V172L225 182L211 170Z"
              class="ta08-task-wood"
            />
            <g class="ta08-task-tool">
              <path
                d="M142 51L164 38L184 51V127L164 141L142 127Z"
                class="ta08-task-jade"
              />
              <path d="M164 56V122M151 73L176 98M176 73L151 98" />
            </g>
          </g>
          <g v-else-if="object === 'garden'" class="ta08-task-body task-garden">
            <path
              d="M64 75L147 64L171 199L87 211ZM147 64L231 78L248 208L171 199Z"
              class="ta08-task-paper"
            />
            <path
              d="M145 77L168 185M89 95L121 91M91 111L128 106M101 171L144 166M186 106L218 111M191 126L224 131"
              class="ta08-task-grain"
            />
            <path
              d="M147 65L158 77L181 199H171Z"
              fill="#355e49"
              fill-opacity=".45"
              stroke-opacity=".25"
            />
            <g class="ta08-task-tool">
              <path
                d="M166 166Q153 115 173 76M169 118Q141 120 137 94Q161 89 169 118ZM169 135Q206 138 210 108Q180 102 169 135Z"
                class="ta08-task-jade"
              />
              <path d="M130 184Q166 197 207 181" />
            </g>
          </g>
          <g v-else-if="object === 'teach'" class="ta08-task-body task-teach">
            <path
              d="M55 95Q102 70 157 92Q210 73 263 96L248 169Q201 151 157 172Q106 151 69 172Z"
              class="ta08-task-paper"
            />
            <path
              d="M157 92V172M80 110Q112 100 141 112M78 126Q110 116 140 128M177 111Q212 100 243 113M174 129Q208 118 238 132"
              class="ta08-task-grain"
            />
            <path
              d="M157 93L165 89L165 167L157 172Z"
              fill="#365947"
              fill-opacity=".5"
              stroke-opacity=".25"
            />
            <path
              d="M88 176L156 192L227 174M156 191V222M116 215H194"
              class="ta08-task-wood"
            />
            <g class="ta08-task-tool">
              <path
                d="M228 47L178 112L172 107L221 43Z"
                class="ta08-tool-wood"
              />
              <path d="M172 107L164 129L178 112Z" class="ta08-tool-fiber" />
            </g>
          </g>
          <g v-else-if="object === 'repose'" class="ta08-task-body task-repose">
            <path
              d="M118 177L111 90L131 65H187L208 90L200 177L182 193H137Z"
              class="ta08-task-bronze"
            />
            <path
              d="M111 90H208M126 102V167M191 102V167M151 98V177M172 98V177M129 183H190M132 64L143 50H175L186 64M148 47Q151 28 161 28Q172 29 172 47"
            />
            <path
              d="M174 91H208L200 177L182 193H174Z"
              fill="#112e28"
              fill-opacity=".5"
              stroke-opacity=".25"
            />
            <path
              d="M99 204Q160 187 222 204M106 210H214"
              class="ta08-task-wood"
            />
            <g class="ta08-task-tool">
              <path
                d="M225 126L248 130L246 177L223 173Z"
                class="ta08-task-paper"
              />
              <path
                d="M235 140V163M228 150H242M229 177V196"
                class="ta08-task-cord"
              />
            </g>
          </g>
          <g v-else-if="object === 'anchor'" class="ta08-task-body task-anchor">
            <path
              d="M79 137L157 109L241 139V195L161 222L79 193Z"
              class="ta08-task-stone"
            />
            <path
              d="M79 137L161 165L241 139M161 165V222M94 171L145 188M181 188L226 171"
              class="ta08-task-inlay"
            />
            <path
              d="M161 165L241 139V195L161 222Z"
              fill="#102f2b"
              fill-opacity=".4"
              stroke-opacity=".3"
            />
            <g class="ta08-task-tool">
              <path
                d="M125 109V77Q126 51 158 51Q194 51 194 77V111L159 124Z"
                class="ta08-task-bronze"
              />
              <path d="M140 94V77Q140 66 159 66Q179 66 179 77V96" />
            </g>
          </g>
          <g
            v-else-if="object === 'rubbing'"
            class="ta08-task-body task-rubbing"
          >
            <path
              d="M87 196L81 60L107 35H217L236 61L230 198Z"
              class="ta08-task-stone"
            />
            <path
              d="M112 50H207M100 73H219M102 188H217"
              class="ta08-task-grain"
            />
            <path d="M106 81L211 85L204 178L111 181Z" class="ta08-task-paper" />
            <path
              d="M123 105L186 109M124 123L174 126M128 142L186 145M127 160L164 163"
              class="ta08-task-ink"
            />
            <path
              d="M106 81L117 93L122 179L111 181Z"
              fill="#466b54"
              fill-opacity=".35"
              stroke-opacity=".2"
            />
            <g class="ta08-task-tool">
              <path
                d="M251 122L211 151L204 140L243 111Z"
                class="ta08-tool-wood"
              />
              <path
                d="M205 138Q178 137 165 164Q193 172 213 152Z"
                class="ta08-tool-fiber"
              />
            </g>
          </g>
          <g v-else class="ta08-task-body task-province">
            <path
              d="M59 71Q80 54 94 69L225 64Q251 51 262 72V175Q249 195 226 182L91 191Q65 200 59 180Z"
              class="ta08-task-paper"
            />
            <path
              d="M76 70V180M241 72V180M100 98L128 86L156 112L187 88L221 114M100 153L134 137L158 156L198 128L225 151"
              class="ta08-task-grain"
            />
            <path
              d="M68 75L76 70V180L68 185ZM241 72L250 70V179L241 180Z"
              class="ta08-task-wood"
            />
            <g class="ta08-task-tool">
              <path
                d="M136 126L164 114L193 128V166L165 180L136 166Z"
                class="ta08-task-jade"
              />
              <path
                d="M153 116V95L166 85L180 96V118M150 143L164 134L180 144L164 163Z"
              />
            </g>
            <path d="M98 198H226" class="ta08-task-wood" />
          </g>
        </g>
      </svg>
      <span
        class="ta08-task-work-trace"
        data-testid="source-work-layer"
        :data-phase="visual.phase"
        aria-hidden="true"
        ><i /><i /><i
      /></span>
      <span
        v-if="arrival"
        :key="sequence"
        class="ta08-task-saved-imprint"
        aria-hidden="true"
      />
      <span class="ta08-object-affordance"
        >定程 <small>查看本段委托</small></span
      >
    </button>
    <p class="ta08-object-caption"
      ><strong>{{ COMMISSION_WORK[sourceId] }}</strong
      ><span>{{
        visual.phase === 'sealing'
          ? '本轮封存中，保存后才计成果'
          : state === 'failed'
            ? '已停办，先核对存档'
            : visual.working
              ? '按已保存的本段安排承办'
              : '差事器物示意 · 确认安排后承办'
      }}</span></p
    >
  </section>
</template>
