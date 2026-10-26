import type { Mode, ModelApi, View } from "../../spec/navigation/api";
import { normalized, seedText, size } from "../../spec/navigation/helpers";

declare const fieldBrand: unique symbol;

export type Field = string & { readonly [fieldBrand]: true };
export type State = View<Field>;

const initialMode: Mode = { $: "Normal", count: 0 };
const fieldSize = BigInt(size);

function makeField(text: string): Field {
  return normalized(text) as Field;
}

export const model: ModelApi<Field, State> = {
  field: makeField,
  at(field, position) {
    if (position < 0n || position >= fieldSize) return " ";
    return field[Number(position)] ?? " ";
  },
  contents(field) {
    return field;
  },
  pack(view) {
    return {
      field: view.field,
      position: view.position,
      mode: { ...view.mode },
    };
  },
  view(state) {
    return {
      field: state.field,
      position: state.position,
      mode: { ...state.mode },
    };
  },
  initial() {
    return model.pack({
      field: makeField(seedText),
      position: 0,
      mode: initialMode,
    });
  },
};
