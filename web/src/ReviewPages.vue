<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {readingPages,type Reading} from './story-pages';
import {pageSlice} from './play-flow';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{rows:Reading[];identity:string}>(),page=ref(0),paged=computed(()=>pageSlice(readingPages(props.rows),page.value,1));
watch(()=>props.identity,()=>page.value=0);
</script>
<template><section class="review-pages" data-testid="review-pages"><article v-for="row in paged.rows" :key="row.key+row.part" class="reading-text" :data-page-key="row.key"><small>{{row.title}}<span v-if="row.parts>1"> · {{row.part}} / {{row.parts}}</span></small><p :data-testid="row.testId">{{row.text}}</p></article><CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="确认详情" @change="page=$event"/></section></template>
