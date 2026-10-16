import type { LocationId } from '../../src/full/content.ts';
import type { CollectionTarget } from '../../src/full/goals.ts';
export interface NavigationRequest {
  location: LocationId; tab: '修行' | '历练' | '行囊' | '仙缘'; focusId?: string; quantity?: number; collection?: CollectionTarget;
}
