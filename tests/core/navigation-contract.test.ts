import { registerAxis, registerLines, registerModel, registerWords } from "../../spec/navigation/checks";
import { axis, lines, model, words } from "../../src/core/navigation";

registerModel(model);
registerAxis(axis);
registerWords({ ...model, ...words });
registerLines({ ...model, ...lines });
