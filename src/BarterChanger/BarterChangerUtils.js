"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.excludedItemsList = exports.moneyType = exports.excludableCashParents = exports.ammoParent = exports.magParent = exports.knownInternalTraders = exports.excludableParents = exports.throwWeaponParent = exports.stackableItemParent = exports.specItemParent = exports.medsParent = exports.mapParent = exports.knifeParent = exports.keyParent = exports.infoParent = exports.compoundItemParent = void 0;
const config_json_1 = __importDefault(require("../../config/config.json"));
exports.compoundItemParent = "566162e44bdc2d3f298b4573";
exports.infoParent = "5448ecbe4bdc2d60728b4568";
exports.keyParent = "543be5e94bdc2df1348b4568";
exports.knifeParent = "5447e1d04bdc2dff2f8b4567";
exports.mapParent = "567849dd4bdc2d150f8b456e";
exports.medsParent = "543be5664bdc2dd4348b4569";
exports.specItemParent = "5447e0e74bdc2d3c308b4567";
exports.stackableItemParent = "5661632d4bdc2d903d8b456b";
exports.throwWeaponParent = "543be6564bdc2df4348b4568";
exports.excludableParents = [
    exports.compoundItemParent,
    exports.infoParent,
    exports.keyParent,
    exports.mapParent,
    exports.specItemParent,
    exports.stackableItemParent,
    // medsParent,
    // knifeParent,
    // throwWeaponParent
];
if (!config_json_1.default.MedBarterItems)
    exports.excludableParents.push(exports.medsParent);
if (!config_json_1.default.MeleeBarterItems)
    exports.excludableParents.push(exports.knifeParent);
if (!config_json_1.default.GrenadeBarterItems)
    exports.excludableParents.push(exports.throwWeaponParent);
exports.knownInternalTraders = new Set(["Fence", "Unknown", "caretaker"]);
exports.magParent = "5448bc234bdc2d3c308b4569";
exports.ammoParent = "5485a8684bdc2da71d8b4567";
exports.excludableCashParents = [exports.ammoParent, exports.specItemParent];
// if (config.hardcoreSettings.excludeMagBarters) excludableCashParents.push(magParent)
exports.moneyType = new Set([
    "5696686a4bdc2da3298b456a",
    "569668774bdc2da2298b4568",
    "5449016a4bdc2d6f028b456f"
]);
exports.excludedItemsList = new Set([
    "59f32bb586f774757e1e8442",
    "59f32c3b86f77472a31742f0",
    "62a08f4c4f842e1bd12d9d62",
    "5bead2e00db834001c062938"
]);
//# sourceMappingURL=BarterChangerUtils.js.map