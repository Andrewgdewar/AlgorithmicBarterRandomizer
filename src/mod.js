"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = require("../config/config.json");
const BarterChanger_1 = require("./BarterChanger/BarterChanger");
class AlgorithmicBarterRandomizer {
    postAkiLoad(container) {
        config_json_1.enable && (0, BarterChanger_1.GlobalValueSetup)(container);
    }
    preAkiLoad(container) {
        config_json_1.enable && (0, BarterChanger_1.BarterChanger)(container);
    }
}
module.exports = { mod: new AlgorithmicBarterRandomizer() };
