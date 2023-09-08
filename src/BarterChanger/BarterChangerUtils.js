"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.excludedItemsList = exports.difficulties = exports.moneyType = exports.ammoParent = exports.excludableParents = exports.throwWeaponParent = exports.stackableItemParent = exports.specItemParent = exports.medsParent = exports.mapParent = exports.knifeParent = exports.keyParent = exports.infoParent = exports.compoundItemParent = void 0;
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
    exports.stackableItemParent
    /*
   ,medsParent,
    knifeParent,
   throwWeaponParent
   */
];
exports.ammoParent = "5485a8684bdc2da71d8b4567";
exports.moneyType = new Set([
    "5696686a4bdc2da3298b456a",
    "569668774bdc2da2298b4568",
    "5449016a4bdc2d6f028b456f"
]);
exports.difficulties = {
    "easy": { ongoing: 1.5, multiplier: 1.5 },
    "medium": { ongoing: 1.3, multiplier: 1.1 },
    "hard": { ongoing: 1.2, multiplier: 1 },
    "masochist": { ongoing: 0.7, multiplier: 0.8 }
};
exports.excludedItemsList = new Set(["59f32bb586f774757e1e8442", "59f32c3b86f77472a31742f0"]);
