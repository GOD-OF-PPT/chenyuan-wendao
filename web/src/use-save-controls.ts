import {computed,onScopeDispose,ref,type Ref} from 'vue';
import type {useGame} from './store';
import type {SessionScope} from './session';
import type {useGameConfirmation} from './use-game-confirmation';
import {MAX_SAVE_BYTES} from '../../src/full/versions.ts';
import {demoSave,parseDemoSave} from '../../src/demo.ts';
import {exportLifeText} from '../../src/full/queries.ts';

export interface SaveControlNavigation {
 source():{current():boolean;mayReturn():boolean};
 blocked():string;
 settings():HTMLDialogElement|undefined;
 importOpener():HTMLElement|null|undefined;
 completed():void;
}

/** Own file-read races and original control intents behind explicit operations. */
export function useSaveControls(store:ReturnType<typeof useGame>,session:SessionScope,
 confirmation:ReturnType<typeof useGameConfirmation>,name:Ref<string>,navigation:SaveControlNavigation){
 const importNotice=ref(''),exportError=ref(''),game=computed(()=>store.game);
 let alive=true,importReadRevision=0;
 onScopeDispose(()=>{alive=false;importReadRevision++;});
 function download(text:string,filename:string,mime='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type:mime})),link=document.createElement('a');
  link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function exportSave(){if(game.value)download(JSON.stringify(session.kind==='demo'?demoSave(session.node!.nodeId,session.node!.sourceDigest,game.value):game.value,null,2),session.kind==='demo'?'尘缘问道-演示存档.json':'尘缘问道-存档.json');}
 async function exportRaw(){
  exportError.value='';
  try{const text=await store.rawText();if(!alive)return;if(text)download(text,'尘缘问道-原始数据库备份.json');else exportError.value='当前没有可导出的数据库';}
  catch(error){if(alive)exportError.value=error instanceof Error?error.message:String(error);}
 }
 async function importFile(event:Event){
  const input=event.target as HTMLInputElement,file=input.files?.[0],owner=++importReadRevision,originDialog=input.closest<HTMLDialogElement>('dialog[open]');
  importNotice.value='';if(!file)return;input.value='';
  const intent=store.prepareImport();if(!intent)return;const source=navigation.source();
  const owns=()=>alive&&owner===importReadRevision;
  const unchanged=()=>!store.busy&&store.available&&source.current()&&(game.value?.core.runId??null)===intent.expectedRunId&&(game.value?.core.revision??0)===intent.expectedRevision;
  if(file.size>MAX_SAVE_BYTES){store.validationError('存档大于 1 MB，未导入');input.value='';return;}
  try{
   let raw=await file.text();if(!owns())return;
   if(!unchanged()||originDialog&&!originDialog.open){importNotice.value='读取文件期间进度已变化，或已离开原页面，未导入。请重新选择文件并核对。';return;}
   if(session.kind==='demo'){try{raw=JSON.stringify(parseDemoSave(raw,session.node!.nodeId,session.node!.sourceDigest));}catch(error){store.validationError(error instanceof Error?error.message:'演示存档无法核对。');return;}}
   const message=(session.kind==='demo'?'导入将替换本节点的演示进度，正常存档保留。请先核对需要保留的备份。':'导入将替换当前进度。建议先导出备份，再明确确认本次覆盖。')+'\n所选文件：'+file.name;
   if(!game.value||await confirmation.ask({kind:'import',title:'导入存档',message,action:'覆盖并导入',cancel:'保留当前进度',current:()=>owns()&&source.current(),blocked:navigation.blocked,mayReturn:()=>owns()&&source.mayReturn(),opener:navigation.settings()?.open?navigation.importOpener()??null:undefined})){
    if(owns()&&unchanged())await store.importPrepared(raw,intent);
    else if(owns())importNotice.value='确认期间进度或安排已变化，本次未导入。请重新选择文件并核对。';
   }
  }catch{if(owns())importNotice.value='文件无法读取，未导入。已有进度保留，请重新选择可读取的存档。';}
 }
 async function reset(){
  const source=navigation.source(),originalName=game.value?.core.player.name??name.value;
  if(await confirmation.ask({kind:'restart',title:session.kind==='demo'?'重载演示节点':'重开人生',message:session.kind==='demo'?'重新载入会替换本节点的演示进度，正常存档保留。':'重新开始会替换当前进度。请先导出需要保留的存档；确认后才重开人生。',action:session.kind==='demo'?'重载此节点':'确认重开',cancel:session.kind==='demo'?'保留演示进度':'继续此生',current:source.current,blocked:navigation.blocked,mayReturn:source.mayReturn})&&alive&&source.current()&&!navigation.blocked()){
   if(session.kind==='demo')await store.importText(JSON.stringify(session.node!.game));else await store.restart(originalName);
   if(alive&&!store.error)navigation.completed();
  }
 }
 async function restore(){
  const intent=store.prepareCheckpoint();if(!intent)return;const source=navigation.source();
  if(await confirmation.ask({kind:'restore',title:'恢复完整准备',message:'回到最近的完整准备检查点，当前进度将被替换。检查点原件仍保留，请核对后确认。',action:'确认恢复',cancel:'保留当前进度',current:source.current,blocked:navigation.blocked,mayReturn:source.mayReturn})&&alive&&source.current()&&!navigation.blocked()){
   await store.restorePrepared(intent);if(alive&&!store.error)navigation.completed();
  }
 }
 function exportLife(){if(game.value)download(exportLifeText(game.value),'尘缘问道-生平.txt','text/plain;charset=utf-8');}
 return {importNotice,exportError,importFile,exportSave,exportRaw,reset,restore,exportLife};
}
