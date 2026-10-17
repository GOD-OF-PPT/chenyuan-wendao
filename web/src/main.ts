import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import DemoFailure from './DemoFailure.vue';
import {requestedDemo,loadDemo} from './demo-loader';
import {sessionKey,demoScope} from './session';
import './style.css';
import './shell.css';
import './demo.css';
async function mount(){let node;try{const id=requestedDemo(location.search);if(id){document.getElementById('app')!.textContent='正在核对演示节点……';node=await loadDemo(id);}}catch(error){createApp(DemoFailure,{message:error instanceof Error?error.message:'演示节点无法核对。'}).mount('#app');return;}const app=createApp(App).use(createPinia());if(node)app.provide(sessionKey,demoScope(node));app.mount('#app');}
void mount();
