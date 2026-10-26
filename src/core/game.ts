import { dispatch, field, glyphAt, imps, initial, observe, scenario, siteAt, snapshot } from "./world";

export type {
  Building,
  BuildingSetup,
  Cursor,
  GameEvent,
  GlyphField,
  Imp,
  ImpSlot,
  MenuSelection,
  Observation,
  Ring,
  Scenario,
  SiteId,
  SiteKind,
  SiteObservation,
  Well,
  World,
} from "./world";
export {
  SITE_HEIGHT,
  SITE_IDS,
  SITE_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./world";

export const game = {
  initial,
  scenario,
  snapshot,
  observe,
  dispatch,
  siteAt,
  glyphAt,
  field,
  imps,
} as const;
