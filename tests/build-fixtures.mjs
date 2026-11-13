import * as C from '../src/full/content.ts';
import * as previous from '../src/legacy/rules-v4/src/full/content.ts';

// The twelve original volumes remain one legal choice per upgrade group.
export const originalSkillIds = Object.keys(previous.skills);
export function legalSkillIds(preferred = []) {
  const chosen = new Map();
  const ids = [...preferred, ...originalSkillIds];
  return [...new Set(ids)].filter((id) => {
    const branch = C.skills[id].branch;
    if (!branch) return true;
    if (chosen.has(branch)) return false;
    chosen.set(branch, id);
    return true;
  });
}
