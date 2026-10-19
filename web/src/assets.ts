import type { LocationId } from '../../src/full/content.ts';
export const SCENE_ASSETS = {
  opening:'art/v2/scenes/opening.webp', wilderness:'art/v2/scenes/wilderness.webp',
  cave:'art/v2/scenes/cave.webp', sect:'art/v2/scenes/sect.webp', market:'art/v2/scenes/market.webp',
  secret:'art/v2/scenes/secret.webp', terrace:'art/v2/scenes/terrace.webp',
} as const;
export const TERRACE_STATE_ASSETS={closed:SCENE_ASSETS.terrace,storm:'art/v2/scenes/terrace-storm.webp',opened:'art/v2/scenes/terrace-opened.webp'} as const;
export const CAVE_MEDITATION_ASSET='art/v2/scenes/cave-meditation.webp';
export const DESKTOP_UI_ASSETS={meditation:'art/v2/ui/meditation-ink.webp'} as const;
export const PANEL_MATERIAL_ASSETS={mountains:'art/v2/ui/mountain-wash-v1.webp'} as const;
export function sceneAssetPath(scene:{key:string;gate:'none'|'closed'|'storm'|'opened';artKey:keyof typeof SCENE_ASSETS},meditation=false){if(meditation&&scene.artKey==='cave')return CAVE_MEDITATION_ASSET;return scene.key==='terrace'&&scene.gate!=='none'?TERRACE_STATE_ASSETS[scene.gate]:SCENE_ASSETS[scene.artKey];}
export const SCENE_CROPS:Record<LocationId,string> = {wilderness:'50% 50%',cave:'50% 50%',sect:'50% 50%',market:'50% 55%',secret:'50% 58%',terrace:'100% 50%'};
export const PORTRAIT_ASSETS:Record<string,string> = {
  player:'art/v2/characters/player.webp',
  shen:'art/v2/characters/shen.webp',
  lu:'art/v2/characters/lu.webp',
  pei:'art/v2/characters/pei.webp',
  yan:'art/v2/characters/yan.webp',
};
export const ENEMY_ASSETS:Record<string,string> = {
  wolf:'art/v2/enemies/wolf.webp',
  warden:'art/v2/enemies/warden.webp',
  serpent:'art/v2/enemies/serpent.webp',
  puppet:'art/v2/enemies/puppet.webp',
  shadow:'art/v2/enemies/shadow.webp',
  sentinel:'art/v2/enemies/sentinel.webp',
  trial_heart:'art/v2/enemies/trial_heart.webp',
  trial_thunder:'art/v2/enemies/trial_thunder.webp',
  trial_gate:'art/v2/enemies/trial_gate.webp',
};
export const NPC_PORTRAITS:Record<string,string> = {'沈清禾':'shen','陆玄松':'lu','裴照':'pei','砚尘':'yan'};

/** Painted gateway coordinates are tied to the terrace-v2 source and its recorded export. */
export const TERRACE_ART={sourcePath:'art/redesign/scenes/terrace-v2.png',sourceHash:'b6c458d7940b530fc1eb605227ae415ebf6851738f12f7e27237ec11aa8e226a',source:{width:1671,height:941},runtime:{width:1536,height:865},position:{x:1,y:.5},bounds:{x:790,y:105,width:760,height:595},doorPath:'M1048 383Q1060 380 1060 370H1210Q1210 380 1222 383V594H1048Z',doorCenter:{x:1135,y:490},doorFoot:{x:1135,y:605},fit:'contain'} as const;
/** Match the full monument's object-fit:contain and right-centered positioning, including encoder rounding. */
export function terraceViewport(width:number,height:number){
 if(width<=0||height<=0)return{x:0,y:0,width:TERRACE_ART.source.width,height:TERRACE_ART.source.height};
 const {source,runtime,position}=TERRACE_ART,scale=Math.min(width/runtime.width,height/runtime.height);
 const visibleWidth=width/scale*source.width/runtime.width,visibleHeight=height/scale*source.height/runtime.height;
 return{x:(source.width-visibleWidth)*position.x,y:(source.height-visibleHeight)*position.y,width:visibleWidth,height:visibleHeight};
}
