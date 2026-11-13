import {computed,shallowRef} from 'vue';

export type StagePosition={view:string;tab:string};
type StageOrigin=StagePosition&{parent:StagePosition|null;opener:HTMLElement|null;id?:string;outerOpener:HTMLElement|null;outerId?:string};
type ReadingOrigin=StagePosition&{runId:string;context:number;opener:HTMLElement|null;parent:StagePosition|null};

/** Own nested readonly returns without knowing travel, clocks, Game or Store. */
export function useStageReturns(position:()=>StagePosition,capture:()=>HTMLElement|null){
 const parent=shallowRef<StagePosition|null>(null),reading=shallowRef<ReadingOrigin|null>(null);
 const stage=shallowRef<StageOrigin|null>(null),tradeoff=shallowRef<StageOrigin|null>(null);
 let opener:HTMLElement|null=null,openerId:string|undefined;
 function remember(event?:Event){
  opener=event?.currentTarget instanceof HTMLElement?event.currentTarget:capture();openerId=opener?.dataset.testid;
 }
 function origin(event?:Event):StageOrigin{
  const source=event?.currentTarget instanceof HTMLElement?event.currentTarget:capture();
  return {...position(),parent:parent.value?{...parent.value}:null,opener:source,id:source?.dataset.testid,outerOpener:opener,outerId:openerId};
 }
 function clearFlow(){stage.value=null;tradeoff.value=null;}
 function reset(){clearFlow();reading.value=null;parent.value=null;}
 function enter(view:string,detail:boolean,event?:Event){
  const current=position();if(!['goal','character','receipt','tradeoffs'].includes(view))clearFlow();
  if(['goal','character','receipt'].includes(view)&&['journey','tradeoffs','cultivation'].includes(current.view))stage.value=origin(event);
  if(!detail||!parent.value)remember(event);
  if(detail&&!parent.value&&current.view!==view)parent.value={...current};
 }
 function captureDetail(view:string,event?:Event){
  if(['goal','character','receipt'].includes(view)&&['journey','tradeoffs','cultivation'].includes(position().view))stage.value=origin(event);
 }
 function enterReading(runId:string,context:number,event?:Event,override?:HTMLElement|null){
  remember(event);if(override!==undefined){opener=override;openerId=undefined;}
  if(position().view!=='life'){
   if(!(reading.value&&parent.value?.view==='life'))reading.value={...position(),runId,context,opener,parent:parent.value};
   parent.value=null;
  }
 }
 function consume(runId:string|undefined,context:number){
  const current=position(),local=['goal','character','receipt'].includes(current.view)&&parent.value?.view!=='life'?stage.value:current.view==='tradeoffs'?tradeoff.value:null;
  const book=!local&&!parent.value&&current.view==='life'&&reading.value?.runId===runId&&reading.value?.context===context?reading.value:null;
  const focus=local?.opener??book?.opener??opener,id=local?.id??openerId;
  opener=local?.outerOpener??null;openerId=local?.outerId;
  const back=local??parent.value??book;parent.value=local?.parent??book?.parent??null;
  if(local===stage.value)stage.value=null;if(local===tradeoff.value)tradeoff.value=null;if(book)reading.value=null;
  return {back,opener:focus,id};
 }
 return {detailParent:computed(()=>parent.value),readingReturn:computed(()=>reading.value),
  get opener(){return opener;},get openerId(){return openerId;},remember,origin,enter,captureDetail,enterReading,consume,
  captureTradeoff(){tradeoff.value=origin();},clearFlow,clearReading(){reading.value=null;},reset};
}
