export type School = 'sword' | 'talisman';
export type SkillSlot = 'mind' | 'builder' | 'finisher';

/** Mechanisms are finite; catalog identities may reuse an existing mechanism. */
export const skillMechanisms = Object.freeze({
  sword: { school: 'sword', slot: 'mind' },
  still: { school: 'sword', slot: 'mind' },
  build: { school: 'sword', slot: 'builder' },
  sword_ward: { school: 'sword', slot: 'builder' },
  release: { school: 'sword', slot: 'finisher' },
  echo: { school: 'sword', slot: 'finisher' },
  talisman: { school: 'talisman', slot: 'mind' },
  calm: { school: 'talisman', slot: 'mind' },
  mark: { school: 'talisman', slot: 'builder' },
  frost: { school: 'talisman', slot: 'builder' },
  detonate: { school: 'talisman', slot: 'finisher' },
  return: { school: 'talisman', slot: 'finisher' },
  pierce: { school: 'sword', slot: 'mind' },
  surge: { school: 'sword', slot: 'builder' },
  shatter: { school: 'sword', slot: 'finisher' },
  clear: { school: 'talisman', slot: 'mind' },
  ember: { school: 'talisman', slot: 'builder' },
  rupture: { school: 'talisman', slot: 'finisher' },
} as const);
for (const definition of Object.values(skillMechanisms))
  Object.freeze(definition);
export type SkillEffect = keyof typeof skillMechanisms;
export const relicMechanisms = Object.freeze({
  frost_sword: true,
  jade_seal: true,
  soul_lamp: true,
  cloud_mirror: true,
});
export type RelicEffect = keyof typeof relicMechanisms;
