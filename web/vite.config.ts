import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({plugins:[vue()],base:'./',server:{fs:{allow:['..']},watch:{ignored:['**/.generated/q14-db10-666-*/**']}},build:{target:'es2022',outDir:'dist',manifest:true}});
