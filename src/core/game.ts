import { build, dispatch, field, glyphAt, imps, initial, link, observe, preview, scenario, siteAt, snapshot } from "./world";

export type {
  Building,
  BuildingSetup,
  Cursor,
  GameEvent,
  GlyphField,
  Imp,
  ImpSlot,
  LinkObservation,
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
  build,
  link,
  preview,
  siteAt,
  glyphAt,
  field,
  imps,
} as const;
