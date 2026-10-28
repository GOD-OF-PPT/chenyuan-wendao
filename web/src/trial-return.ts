import type {Game} from '../../src/full/types.ts';
import type {CheckpointSummary} from './store.ts';
import type {getTrialRecovery} from '../../src/full/queries.ts';
import {realms} from '../../src/full/content.ts';

/** Reads the Store's already verified checkpoint; never creates a snapshot or restore intent. */
export function trialReturnView(game:Game,checkpoint:CheckpointSummary|null,recovery:ReturnType<typeof getTrialRecovery>,known:boolean){
 if(game.status!=='active'||game.core.mode!=='idle'||game.trial||game.battle||game.core.player.realm!=='spirit'||game.core.world.location!=='cave'||game.core.player.xp<realms.spirit.xpCap||game.core.inventory.ascension_seal>0)return null;
 const cp=known&&checkpoint?.kind==='trial'?checkpoint:null,fact=known?recovery:null;
 return{choice:!!cp||!!fact,canRestore:!!cp,canRecord:!!fact,
  title:fact?'渡劫暂歇，选择归途':'已有完整准备可核对',
  state:fact?`本轮止于第 ${fact.stage} 关 · ${fact.stageName}`:'可比较原准备与当前进度，再决定去留。',
  currentSeal:game.core.inventory.ascension_seal,savedSeal:cp?.target.inventory.ascension_seal??null,
  notice:known?'未找到本局已验证的渡劫准备检查点；保留当前资源重新筹备，不会补发渡劫引。':'检查点尚待核对；先处理当前存档提示，不据旧摘要确认恢复。',
 };
}
