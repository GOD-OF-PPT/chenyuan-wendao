import { driver, finishTrial } from './full-route.mjs';
export function causalRoute({ choice = 'leave', school = 'sword', meet = 'decline', echo = 'solo', returnVisit = true, shenAid = true, peiAid = true, finish = true } = {}) {
  const d = driver(choice, school); d.realm();
  const before = {}, after = {};
  const event = (id, option) => { before[id] = structuredClone(d.game); d.event(id, option); after[id] = structuredClone(d.game); };
  const visit = choice === 'help' ? 'accept' : choice === 'trade' ? 'bargain' : 'assist';
  if (returnVisit && choice === 'trade') d.funds(18);
  if (returnVisit && choice === 'leave') d.resource('herb', 2);
  event('shen_return', returnVisit ? visit : 'decline');
  if (meet === 'cooperate') d.funds(15); event('pei_meet', meet);
  d.realm(); d.resource('jade', 4); d.funds(140); d.go('cave'); d.doAction({ type: 'FORGE', relic: 'jade_seal' }); d.doAction({ type: 'EQUIP_RELIC', relic: 'jade_seal' });
  const joint = meet === 'cooperate' ? 'share' : meet === 'rival' ? 'contest' : 'reconnect';
  if (echo === 'joint') d.resource('lotus', 1);
  event('pei_echo', echo === 'joint' ? joint : 'solo');
  d.realm();
  if (shenAid) { d.buy('healing_pill', 2); if (!returnVisit) d.resource('herb', 2); }
  event('shen_pact', shenAid ? returnVisit ? 'lend' : 'rebuild' : 'decline');
  d.realm();
  if (peiAid) { d.resource('dao', 1); if (echo !== 'joint') d.resource('lotus', 1); }
  event('pei_pact', peiAid ? echo === 'joint' ? 'ally' : 'renew' : 'decline');
  if (finish) finishTrial(d);
  return { driver: d, before, after };
}
