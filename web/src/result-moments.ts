import type { Activity } from '../../src/full/activity.ts';
import type { ActionResult } from '../../src/full/contracts.ts';
import type { Game } from '../../src/full/types.ts';
import { contentForGame } from '../../src/full/rule-content.ts';
import { getLifeRecord } from '../../src/full/queries.ts';
import type { Observation } from './local-events.ts';
import { activityFeedbackObservation, createActionFeedbackTracker, type ActionNotice } from './action-feedback.ts';
import { formatCosts, formatDelta } from './presentation.ts';
export interface ResultMoment {
    key: string;
    runId: string;
    revision: number;
    title: string;
    change: string;
    costs: string;
    enemyId: string | null;
    kind: 'harvest' | 'choice' | 'breakthrough' | 'elixir' | 'victory' | 'ending';
    icon: ActionNotice['icon'];
    context: string;
}
export function resultMomentKind(operation: string, victory = false) {
    if (operation === 'SOURCE' || operation === 'CULTIVATE')
        return 'harvest';
    if (['CHOOSE', 'DECIDE', 'ANSWER_TRIAL'].includes(operation))
        return 'choice';
    if (operation === 'BREAKTHROUGH')
        return 'breakthrough';
    if (operation === 'CRAFT')
        return 'elixir';
    if (operation === 'BATTLE' && victory)
        return 'victory';
    if (['END', 'RETIRE', 'END_LIFE'].includes(operation))
        return 'ending';
    return null;
}
/** Read-only presentation of the current confirmed result, never a reward ledger. */
export function createResultMomentTracker() {
    const feedback = createActionFeedbackTracker();
    return { consume(o: Observation, g: Game | null, r: ActionResult | null, a: Activity | null, replayed: boolean, eligible: boolean): ResultMoment | null {
            if (!g || !r)
                return null;
            const kind = resultMomentKind(r.type, r.delta.wins > 0);
            if (!kind)
                return null;
            const p = o.result;
            if (!p || p.revisionBefore !== r.revisionBefore || p.revisionAfter !== r.revisionAfter || p.executedSteps !== r.executedSteps || p.requestedSteps !== r.requestedSteps ||
                p.phaseBefore !== r.phaseBefore || p.phaseAfter !== r.phaseAfter || p.stopCode !== (r.stopReason?.code ?? null) ||
                JSON.stringify(p.costs) !== JSON.stringify(r.costs) || JSON.stringify(p.delta) !== JSON.stringify(r.delta))
                return null;
            let local = activityFeedbackObservation(o, a, r);
            if (r.type === 'SOURCE' || r.type === 'CRAFT' || r.type === 'CULTIVATE') {
                const matches = r.type === 'SOURCE' ? a?.version === 2 && a.plan.sourceId === o.action?.sourceId : r.type === 'CRAFT' ? a?.version === 3 && a.plan.recipeId === o.action?.recipeId : a?.version === 1 && a.plan.method === o.action?.method;
                if (!a || !matches)
                    return null;
                const id = `cycle:${a.id}:${a.generation}:${a.completedCycles}`;
                if (r.commandId !== id || r.runId !== a.runId || r.revisionAfter !== a.gameRevision)
                    return null;
                local = o.commandId === null ? { ...o, commandId: id } : o;
            }
            const notice = feedback.consume(local, g, r, replayed, eligible);
            if (!notice)
                return null;
            const enemy = o.enemyId ? contentForGame(g).enemies[o.enemyId] : null;
            if (kind === 'ending') {
                if (g.status === 'active')
                    return null;
                const { overview } = getLifeRecord(g);
                return { key: notice.key, runId: g.core.runId, revision: g.core.revision, kind, title: overview.title, context: overview.conclusion, enemyId: null,
                    change: `${overview.name} · ${overview.realmName} · 行道 ${overview.elapsedMonths} 游戏月`, costs: formatCosts(r.costs), icon: notice.icon };
            }
            return { key: notice.key, runId: g.core.runId, revision: g.core.revision, kind, title: kind === 'victory' && enemy ? notice.label + ' · ' + enemy.name : notice.label, change: formatDelta({ ...r.delta, months: 0 }), costs: formatCosts(r.costs), icon: notice.icon, context: kind === 'choice' ? g.journal.at(-1) ?? '' : '', enemyId: enemy ? o.enemyId : null };
        } };
}
