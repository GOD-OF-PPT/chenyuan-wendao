import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import DemoFailure from './DemoFailure.vue';
import {requestedDemo,loadDemo} from './demo-loader';
import {sessionKey,demoScope} from './session';
import './style.css';
import './shell.css';
import './demo.css';
import './game-hub.css';
import './panel-materials.css';
import './immersive-theme.css';
import './action-motion.css';
async function mount(){let node;try{const id=requestedDemo(location.search);if(id){document.getElementById('app')!.textContent='正在核对演示节点……';node=await loadDemo(id);}}catch(error){createApp(DemoFailure,{message:error instanceof Error?error.message:'演示节点无法核对。'}).mount('#app');return;}const app=createApp(App).use(createPinia());if(node)app.provide(sessionKey,demoScope(node));app.mount('#app');}
void mount();

import './play-flow.css';

import './story-book.css';
import './catalogue-art.css';
import './idle-activity.css'
import './idle-sources.css'
import './idle-production.css';

import './idle-preparation.css';

import './stage-r1.css';

import './stage-r2.css';

import './stage-r3.css';

import './stage-r4.css';
import './idle-tradeoffs.css';
import './local-loading.css';

import './alchemy-workshop.css';
import './art03-equipment.css'
import './art16-schools.css';

import './game-menus.css';
import './art10-equipment.css';
import './art11-inventory.css';

import './art12-narrative.css';
