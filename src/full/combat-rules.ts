import type { Game } from './types.ts';
import { contentForGame } from './rule-content.ts';

/** The same finite mechanism IDs drive the resolver and its pre-encounter explanation. */
export function enemyMechanismText(game: Game, id: string): string {
  const enemy = contentForGame(game).enemies[id];
  if (!enemy || !('mechanism' in enemy))
    return '观察蓄势，重击前护体或以终结断势。';
  switch (enemy.mechanism) {
    case 'reflection':
      return '剑傀每四回合有一轮反震：返还实际直伤35%（最多45）。护体回灵，或让符印灼伤；击破时反震仍生效。';
    case 'drain':
      return '心魇每次造成净伤害便等量回血。护体减伤可削弱回血；蓄势时备好剑意或符印，重击时断势。';
    case 'ward':
      return '守灵护阵时直伤减半，符印灼伤照常；随后蓄势、重压225，寻常终结不能打断。护体、破阵终结或备药应对。';
    default:
      return '观察蓄势，重击前护体或以终结断势。';
  }
}
