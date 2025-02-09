import config from "../../config/config.json";
export const compoundItemParent = "566162e44bdc2d3f298b4573";
export const infoParent = "5448ecbe4bdc2d60728b4568";
export const keyParent = "543be5e94bdc2df1348b4568";
export const knifeParent = "5447e1d04bdc2dff2f8b4567";
export const mapParent = "567849dd4bdc2d150f8b456e";
export const medsParent = "543be5664bdc2dd4348b4569";
export const specItemParent = "5447e0e74bdc2d3c308b4567";
export const stackableItemParent = "5661632d4bdc2d903d8b456b";
export const throwWeaponParent = "543be6564bdc2df4348b4568";

export const excludableParents = [
  compoundItemParent,
  infoParent,
  keyParent,
  mapParent,
  specItemParent,
  stackableItemParent,
  // medsParent,
  // knifeParent,
  // throwWeaponParent
];
if (!config.MedBarterItems) excludableParents.push(medsParent);
if (!config.MeleeBarterItems) excludableParents.push(knifeParent);
if (!config.GrenadeBarterItems) excludableParents.push(throwWeaponParent);

export const knownInternalTraders = new Set(["Fence", "Unknown", "caretaker"]);

export const magParent = "5448bc234bdc2d3c308b4569";
export const ammoParent = "5485a8684bdc2da71d8b4567";
export const containerParent = "5671435f4bdc2d96058b4569";
export const simpleContainer = "5795f317245977243854e041";

export const bulletCostMultiplier = 10;

export const excludableCashParents = [
  ammoParent,
  specItemParent,
  simpleContainer,
  containerParent,
];
// if (config.hardcoreSettings.excludeMagBarters) excludableCashParents.push(magParent)

export const multipleCostType = [ammoParent];

export const moneyType = new Set([
  "5696686a4bdc2da3298b456a",
  "569668774bdc2da2298b4568",
  "5449016a4bdc2d6f028b456f",
]);

export const turnToCashType = [simpleContainer, containerParent];

export const excludedItemsList = new Set([
  containerParent,
  simpleContainer,
  "59f32bb586f774757e1e8442",
  "59f32c3b86f77472a31742f0",
  "62a08f4c4f842e1bd12d9d62",
  "5bead2e00db834001c062938",
]);
