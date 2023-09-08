"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = require("../config/config.json");
const BarterChanger_1 = __importDefault(require("./BarterChanger/BarterChanger"));
class AlgorithmicBarterRandomizer {
    postAkiLoad(container) {
        config_json_1.enable && (0, BarterChanger_1.default)(container);
    }
}
module.exports = { mod: new AlgorithmicBarterRandomizer() };
