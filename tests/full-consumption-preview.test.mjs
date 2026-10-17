import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import {driver} from './full-route.mjs';
import {createConsumptionPreview,trackingConsumption,preparationConsumption} from '../src/full/goals.ts';
function fixture(){const d=driver();d.resource('herb',8);d.resource('dew',2);d.resource('core',1);d.funds(20);d.go('market');return d;}
const merged=(game,target,preparation,action)=>[...trackingConsumption(game,target,action),...(preparation?preparationConsumption(game,preparation,action):[])].filter((gap,i,all)=>all.findIndex(other=>other.id===gap.id)===i);
test('panel consumption snapshot preserves all existing target/preparation warnings and legal-action semantics',()=>{
 const d=fixture();const skill=Object.keys(C.skills).find(id=>C.skills[id].school==='sword'&&C.skills[id].slot==='mind');const targets=[{kind:'breakthrough'},{kind:'item',id:'herb',quantity:8},{kind:'skill',id:skill},{kind:'relic',id:'jade_seal'},{kind:'event',id:'shen_return'}];
 const actions=[...Object.keys(C.items).map(item=>({type:'SELL',item,quantity:1})),...Object.keys(C.recipes).map(recipeId=>({type:'CRAFT',recipeId})),{type:'USE',item:'healing_pill'},{type:'TRAVEL',location:'cave'}];
 for(const place of ['market','cave']){d.go(place);const original=structuredClone(d.game);for(const target of targets)for(const preparation of [null,{type:'CRAFT',recipeId:'foundation'}]){const preview=createConsumptionPreview(d.game,target,preparation);for(const action of actions)assert.deepEqual(preview(action),merged(d.game,target,preparation,action));}assert.deepEqual(d.game,original);}
});
test('snapshot warning cache cannot be poisoned by a caller and does not follow later mutations',()=>{
 const d=fixture(),target={kind:'item',id:'herb',quantity:8},action={type:'SELL',item:'herb',quantity:1},original=structuredClone(d.game);const preview=createConsumptionPreview(d.game,target);
 const warning=preview(action);assert.equal(warning[0].missing,1);warning[0].missing=999;assert.equal(preview(action)[0].missing,1);assert.deepEqual(d.game,original);
 d.game.core.inventory.herb=0;target.quantity=1;assert.equal(preview(action)[0].missing,1);assert.deepEqual(createConsumptionPreview(d.game,target)(action),[]);
});
test('a new committed revision or changed preparation gets a new read scope without reserving resources',()=>{
 const d=fixture(),target={kind:'item',id:'herb',quantity:8},action={type:'SELL',item:'herb',quantity:1};const first=createConsumptionPreview(d.game,target);d.doAction(action);assert.equal(first(action)[0].missing,1);assert.equal(createConsumptionPreview(d.game,target)(action)[0].missing,2);
 d.go('cave');const original=structuredClone(d.game);const prep={type:'CRAFT',recipeId:'healing'};assert.deepEqual(createConsumptionPreview(d.game,{kind:'breakthrough'},prep)(prep),merged(d.game,{kind:'breakthrough'},prep,prep));assert.deepEqual(d.game,original);
});
test('malformed or future-version snapshots are rejected before a cached read scope is created',()=>{const d=fixture();const bad=structuredClone(d.game);bad.core.revision=-1;assert.throws(()=>createConsumptionPreview(bad,{kind:'breakthrough'}));const future=structuredClone(d.game);future.core.contentVersion='future';assert.throws(()=>createConsumptionPreview(future,{kind:'breakthrough'}));assert.throws(()=>createConsumptionPreview(d.game,{kind:'item',id:'unknown',quantity:1}));});
