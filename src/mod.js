"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = require("../config/config.json");
const BarterChanger_1 = require("./BarterChanger/BarterChanger");
class AlgorithmicBarterRandomizer {
    postSptLoad(container) {
        config_json_1.enable && (0, BarterChanger_1.GlobalValueSetup)(container);
    }
    preSptLoad(container) {
        config_json_1.enable && (0, BarterChanger_1.BarterChanger)(container);
    }
}
module.exports = { mod: new AlgorithmicBarterRandomizer() };
//# sourceMappingURL=mod.js.map