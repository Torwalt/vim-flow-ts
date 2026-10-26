import { registerAxis, registerModel, registerWords } from "../../spec/navigation/checks";
import { axis, model, words } from "../../src/core/navigation";

registerModel(model);
registerAxis(axis);
registerWords({ ...model, ...words });
