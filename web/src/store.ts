import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { createAdventure, parseAdventure } from '../../src/game/adventure.ts';
import type { Adventure, GameAction } from '../../src/game/adventure.ts';
import { SaveRepository, token } from './persistence';
export const useGame=defineStore('game',()=>{
  const game=shallowRef<Adventure|null>(null),busy=ref(false),error=ref(''),saved=ref(false),ready=ref(false);
  let repository:SaveRepository|undefined;let channel:BroadcastChannel|undefined;
  async function refresh(){if(!repository)return;const next=await repository.load();game.value=next;saved.value=true;}
  async function init(){try{repository=await SaveRepository.open();await refresh();if('BroadcastChannel' in globalThis){channel=new BroadcastChannel('chenyuan-progress');channel.onmessage=()=>{if(!busy.value)refresh().catch(e=>error.value=String(e));};}ready.value=true;}catch(e){error.value='无法读取存档：'+(e instanceof Error?e.message:String(e));ready.value=true;}}
  async function write(fn:()=>Promise<Adventure>){if(busy.value)return;busy.value=true;error.value='';saved.value=false;try{game.value=await fn();saved.value=true;channel?.postMessage('saved');}catch(e){error.value=e instanceof Error?e.message:String(e);try{await refresh();}catch{saved.value=false;}}finally{busy.value=false;}}
  async function start(name:string){if(!repository){error.value='存储尚未就绪，请重新载入页面。';return;}if(!name.trim()){error.value='请填写道号';return;}await write(()=>repository!.initialize(name.trim()));}
  async function act(action:GameAction){const current=game.value;if(!current||!repository)return;const command={...action,commandId:crypto.randomUUID(),runId:current.core.runId,expectedRevision:current.core.revision};await write(()=>repository!.execute(command));}
  async function importText(text:string){if(!repository)return;let parsed:Adventure;try{parsed=parseAdventure(text);}catch(e){error.value=e instanceof Error?e.message:String(e);return;}const expected=game.value?token(game.value):null;await write(()=>repository!.replace(parsed,expected));}
  async function restart(name:string){if(!repository||!game.value)return;const expected=token(game.value);await write(()=>repository!.replace(createAdventure(name,crypto.randomUUID()),expected));}
  async function checkpoint(){if(!repository||!game.value)return;const expected=token(game.value);await write(()=>repository!.restoreCheckpoint(expected));}
  return{game,busy,error,saved,ready,init,start,act,importText,restart,checkpoint};
});
