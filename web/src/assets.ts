import type { LocationId } from '../../src/full/content.ts';
export const SCENE_ASSETS = {
  wilderness: 'art/scenes/wilderness.webp', settlement: 'art/scenes/settlement.webp',
  secret: 'art/scenes/secret.webp', terrace: 'art/scenes/terrace-v2.webp',
} as const;
export const SCENE_CROPS:Record<LocationId,string> = {wilderness:'67% 50%',cave:'100% 48%',sect:'65% 24%',market:'100% 75%',secret:'73% 48%',terrace:'72% 28%'};
export const PORTRAIT_ASSETS:Record<string,string> = Object.fromEntries(['player','shen','lu','pei','yan'].map(id=>[id,`art/portraits/${id}.webp`]));
export const NPC_PORTRAITS:Record<string,string> = {'沈清禾':'shen','陆玄松':'lu','裴照':'pei','砚尘':'yan'};

/** Painted gateway coordinates are tied to the terrace-v2 source and its recorded export. */
export const TERRACE_ART={sourceHash:'7404105d35ece7a45ee080a1b37385d712c4066cd78729d907ae513e591d184d',source:{width:1672,height:941},runtime:{width:1536,height:865},position:{x:.72,y:.28},bounds:{x:1030,y:210,width:350,height:260},doorPath:'M1151 354Q1158 351 1158 339H1243Q1243 350 1251 354V435H1151Z'} as const;
/** Match object-fit:cover/object-position exactly, including the encoder's aspect rounding. */
export function terraceViewport(width:number,height:number){
 if(width<=0||height<=0)return{x:0,y:0,width:TERRACE_ART.source.width,height:TERRACE_ART.source.height};
 const {source,runtime,position}=TERRACE_ART,scale=Math.max(width/runtime.width,height/runtime.height);
 const visibleWidth=width/scale*source.width/runtime.width,visibleHeight=height/scale*source.height/runtime.height;
 return{x:(source.width-visibleWidth)*position.x,y:(source.height-visibleHeight)*position.y,width:visibleWidth,height:visibleHeight};
}
