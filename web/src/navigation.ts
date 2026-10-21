import {rank,realms,type LocationId,type RealmId} from '../../src/full/content.ts';
import type { CollectionTarget } from '../../src/full/goals.ts';
import type {Game} from '../../src/full/types.ts';
import {gamePhase} from '../../src/full/contracts.ts';
import {previewAction} from '../../src/full/queries.ts';
import {ADVENTURE_CYCLE_MS} from '../../src/full/adventure.ts';
import {formatCosts} from './presentation.ts';
export interface NavigationRequest {
  location: LocationId; tab: '修行' | '历练' | '行囊' | '仙缘'; focusId?: string; quantity?: number; collection?: CollectionTarget;
}
export function describeVisitRoute(game:Game,next:{location:LocationId;min:RealmId;unlocked:boolean}|null|undefined,state:{enabled:boolean;busy:boolean;running:boolean}){
 if(!next)return{allowed:false,text:''};
 const here=game.core.world.location===next.location,quote=previewAction(game,{type:'TRAVEL',location:next.location});
 const reason=!state.enabled?'存档未就绪':state.busy?'保存中，请稍候':!next.unlocked?(rank(game.core.player.realm)<rank(next.min)?'需'+realms[next.min].name+'境界':'来往条件未满足，请查看下次说明'):gamePhase(game)!=='idle'?'先处理当前遭遇':!here&&state.running?'请先暂停当前活动':!here&&!quote.allowed?quote.failure?.message??'当前无法行旅':'';
 const cost=here?'已在此地，查看不耗时':formatCosts(quote.actualCosts??quote.costs)+' · '+ADVENTURE_CYCLE_MS.travel/1000+'秒行旅';
 return{allowed:!reason,text:[reason,cost,'仅前往查看；拜访另行确认'].filter(Boolean).join(' · ')};
}
