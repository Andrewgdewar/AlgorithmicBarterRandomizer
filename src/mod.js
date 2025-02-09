"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = require("../config/config.json");
const BarterChanger_1 = require("./BarterChanger/BarterChanger");
const GlobalValues_1 = require("./BarterChanger/GlobalValues");
class AlgorithmicBarterRandomizer {
    preSptLoad(container) {
        config_json_1.enable && (0, BarterChanger_1.BarterChanger)(container);
    }
    postSptLoad(container) {
        if (config_json_1.enable) {
            (0, BarterChanger_1.GlobalValueSetup)(container);
            GlobalValues_1.globalValues.updateBarters();
        }
    }
}
module.exports = { mod: new AlgorithmicBarterRandomizer() };
//# sourceMappingURL=mod.js.map