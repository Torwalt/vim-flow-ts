import type { NavigationApi } from "../../spec/navigation/api";
import { axis } from "./axis";
import { find } from "./find";
import { input } from "./input";
import { lines } from "./lines";
import { model, type Field, type State } from "./model";
import { words } from "./words";

export type {
  AxisApi,
  Direction,
  FindApi,
  Input,
  LineMotion,
  LinesApi,
  Mode,
  ModelApi,
  View,
  WordMotion,
  WordsApi,
} from "../../spec/navigation/api";
export type { Field, State } from "./model";
export { axis } from "./axis";
export { find } from "./find";
export { input } from "./input";
export { lines } from "./lines";
export { model } from "./model";
export { words } from "./words";

export const actualApi: NavigationApi<Field, State> = {
  ...model,
  ...axis,
  ...words,
  ...lines,
  ...find,
  ...input,
};
