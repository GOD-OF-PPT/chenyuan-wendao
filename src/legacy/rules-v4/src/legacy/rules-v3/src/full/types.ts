import type {RealmId,LocationId,School} from './content.ts';
import type {SAVE_FORMAT,SAVE_VERSION,SCHEMA_VERSION} from './versions.ts';
export type Choice='help'|'trade'|'leave';
export type Move='attack'|'guard'|'technique'|'release'|'heal'|'restore'|'flee';
export interface Battle {enemy:string;hp:number;round:number;sword:number;marks:number[];log:string[];}
export interface Game {
 format:typeof SAVE_FORMAT;version:typeof SAVE_VERSION;
 core:{schemaVersion:typeof SCHEMA_VERSION;contentVersion:string;balanceVersion:string;runId:string;revision:number;mode:'event'|'idle';
  player:{name:string;realm:RealmId;xp:number;hp:number;mp:number;stones:number;startAgeMonths:number};
  world:{location:LocationId;elapsedMonths:number};inventory:Record<string,number>;openingChoice:Choice|null;
  learnedSkills:string[];activeEvent:{id:string;instanceId:string}|null};
 school:School|null;loadout:{mind:string|null;builder:string|null;finisher:string|null;relic:string|null};
 learned:string[];ownedRelics:string[];battle:Battle|null;journal:string[];wins:number;
 choices:Record<string,string>;milestones:Record<string,number>;
 trial:{stage:number;answer:'accept'|'release'|null}|null;
 status:'active'|'ascended'|'ended';ending:'transmit'|'depart'|'retired'|'lifespan'|null;
}
export type Action=
 |{type:'CHOOSE';choice:Choice}|{type:'TRAVEL';location:LocationId}
 |{type:'CULTIVATE';method:'natural'|'assisted';count?:number}
 |{type:'SOURCE';sourceId:string;count?:number;target?:{item:string;quantity:number}}
 |{type:'BUY'|'SELL';item:string;quantity:number}|{type:'CRAFT';recipeId:string}|{type:'USE';item:string}
 |{type:'REST'}|{type:'BREAKTHROUGH'}|{type:'SCHOOL';school:School}
 |{type:'STUDY';manual:'jinghong'}|{type:'LEARN';skill:string}|{type:'EQUIP';skill:string}|{type:'FORGE';relic:string}|{type:'EQUIP_RELIC';relic:string}
 |{type:'ENCOUNTER';enemy:string}|{type:'BATTLE';move:Move}|{type:'EVENT';event:string}|{type:'DECIDE';option:string}
 |{type:'START_TRIAL'}|{type:'ANSWER_TRIAL';answer:'accept'|'release'}|{type:'END';ending:'transmit'|'depart'}|{type:'RETIRE'}|{type:'END_LIFE'};
export type Command=Action&{commandId:string;runId:string;expectedRevision:number};
