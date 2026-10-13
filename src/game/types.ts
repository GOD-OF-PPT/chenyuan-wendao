/** M1 economic slice only. This is not the final battle/persistence GameState. */
export type RealmId = 'mortal' | 'qi' | 'foundation';
export type ItemId = 'herb' | 'dew' | 'core' | 'healing_pill' | 'spirit_pill' | 'foundation_pill';
export type LocationId = 'wilderness' | 'cave' | 'sect' | 'market';
export type Choice = 'help' | 'trade' | 'leave';
export interface State {
  schemaVersion: 1;
  contentVersion: string;
  balanceVersion: string;
  runId: string;
  revision: number;
  mode: 'event' | 'idle';
  player: { name: string; realm: RealmId; xp: number; hp: number; mp: number; stones: number; startAgeMonths: number };
  world: { location: LocationId; elapsedMonths: number };
  inventory: Record<ItemId, number>;
  openingChoice: Choice | null;
  learnedSkills: string[];
  activeEvent: { id: 'temple'; instanceId: string } | null;
}
export type Action =
  | { type: 'CHOOSE'; choice: Choice }
  | { type: 'TRAVEL'; location: LocationId }
  | { type: 'CULTIVATE'; method: 'natural' | 'assisted'; count?: number }
  | { type: 'SOURCE'; sourceId: string; count?: number; target?: { item: ItemId; quantity: number } }
  | { type: 'BUY' | 'SELL'; item: ItemId; quantity: number }
  | { type: 'CRAFT'; recipeId: string }
  | { type: 'USE'; item: ItemId }
  | { type: 'REST' }
  | { type: 'BREAKTHROUGH' };
export type Command = Action & { commandId: string; runId: string; expectedRevision: number };
export interface Receipt {
  commandId: string;
  revisionBefore: number;
  revisionAfter: number;
  steps: number;
  stopReason: string | null;
  delta: { xp: number; hp: number; mp: number; stones: number; months: number; inventory: Record<ItemId, number> };
}
export interface Transition { state: State; receipt: Receipt }
export interface Realm {
  name: string; xpCap: number; baseYield: number; maxHp: number; maxMp: number;
  lifespanMonths: number; next: RealmId | null; breakthroughCost: Partial<Record<ItemId, number>>;
}
export interface Item { name: string; minRealm: RealmId; buy: number; sell: number | null; healHp?: number; healMp?: number }
export interface Source {
  name: string; location: LocationId; minRealm: RealmId; months: number; stones: number; xp: number;
  items: Partial<Record<ItemId, number>>;
}
export interface Recipe {
  name: string; minRealm: RealmId; inputs: Partial<Record<ItemId, number>>;
  stones: number; months: number; output: ItemId;
}
export interface Content {
  version: string; balanceVersion: string;
  realms: Record<RealmId, Realm>; items: Record<ItemId, Item>;
  sources: Record<string, Source>; recipes: Record<string, Recipe>;
  cultivation: Record<'natural' | 'assisted', { minRealm: RealmId; months: number; stones: number; bonusPercent: number }>;
  modifiers: { cultivationBonusCapPercent: number; maxBatch: number; maxQuantity: number };
}
