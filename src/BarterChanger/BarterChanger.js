"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = __importDefault(require("../../config/config.json"));
const BarterChangerUtils_1 = require("./BarterChangerUtils");
const utils_1 = require("../utils");
const LogTextColor_1 = require("C:/snapshot/project/obj/models/spt/logging/LogTextColor");
const fs = require("fs");
function BarterChanger(container) {
    const tables = container.resolve("DatabaseServer").getTables();
    const items = tables.templates.items;
    const flee = tables.globals.config.RagFair;
    const ragFairServer = container.resolve("RagfairServer");
    const prices = tables.templates.prices;
    const logger = container.resolve("WinstonLogger");
    const traders = tables.traders;
    if (config_json_1.default.enableHardcore && config_json_1.default.hardcoreSettings.disableFlee)
        flee.minUserLevel = 99;
    const tradersToInclude = new Set([
        "Prapor",
        "Therapist",
        "Skier",
        "Peacekeeper",
        "Mechanic",
        "Ragman",
        "Jaeger",
        ...config_json_1.default.customTradersToInclude
    ]);
    const loot = tables.loot.staticLoot;
    const lootList = new Set(Object.values(loot)
        .map(({ itemDistribution }) => itemDistribution)
        .flat(1).map(({ tpl }) => tpl));
    const filterLootList = [...lootList].filter(id => !(0, utils_1.checkParentRecursive)(id, items, BarterChangerUtils_1.excludableParents));
    const getName = (id) => {
        const itemNameId = `${id} Name`;
        const itemShortNameId = `${id} ShortName`;
        return `${local[itemNameId]} (${local[itemShortNameId]})`;
    };
    const locales = tables.locales;
    const local = locales.global.en;
    const handbook = tables.templates.handbook;
    const handbookMapper = {};
    handbook.Items.forEach(({ Id, Price }) => {
        handbookMapper[Id] = Price;
    });
    const tradeItemMapper = {};
    Object.keys(traders).forEach((traderId) => {
        const trader = traders[traderId];
        if (!tradersToInclude.has(trader.base.nickname))
            return;
        trader?.assort?.items.forEach(item => {
            tradeItemMapper[item._id] = item._tpl;
        });
    });
    const getPrice = (id, reverse = false) => {
        let multiplier = 1;
        if (!items[id]._props.CanSellOnRagfair)
            multiplier *= 2;
        const handbookVal = handbookMapper[id];
        const fleaVal = prices[id];
        switch (true) {
            case reverse && !!fleaVal && !isNaN(fleaVal) && handbookVal && !isNaN(handbookVal):
                return (handbookVal + fleaVal / 2) * multiplier;
            case !!fleaVal && !isNaN(fleaVal):
                return fleaVal * multiplier;
            case !!handbookVal && !isNaN(handbookVal):
                return handbookVal * multiplier;
            default:
                break;
        }
    };
    const cutLootList = [...filterLootList].sort((a, b) => getPrice(a) - getPrice(b));
    const getAlt = (randomSeed, totalCost, itemSet) => {
        const filteredLootList = cutLootList.filter((id) => !itemSet.has(id) && !BarterChangerUtils_1.excludedItemsList.has(id));
        let maxKey = filteredLootList.findIndex((id) => getPrice(id) > totalCost);
        if (maxKey < 0)
            maxKey = filteredLootList.length - 1;
        if (maxKey < 10)
            maxKey = 10;
        let minKey = maxKey === (filteredLootList.length - 1) ? maxKey - 50 : maxKey - 20;
        if (minKey < 0)
            minKey = 0;
        const newKey = (0, utils_1.seededRandom)(minKey, maxKey, randomSeed);
        const newId = filteredLootList[newKey];
        if (!newId) {
            logger.error(`Unable to find 'newId' random seed ${randomSeed} new key${newKey} ${minKey}${maxKey}`);
            return "";
        }
        return newId;
    };
    const getNewBarterList = (randomSeed, ongoingCost = 0, newBarterList = [], originalTotalCost, isCash = false, itemSet) => {
        const totalRemaining = originalTotalCost - ongoingCost;
        const newId = getAlt(randomSeed, totalRemaining, itemSet);
        if (!newId)
            return undefined;
        itemSet.add(newId);
        const value = getPrice(newId);
        let itemCount = Math.round((totalRemaining / value)) || 1;
        if (itemCount > 15)
            itemCount = 15;
        const cost = value * itemCount;
        if (config_json_1.default.debug || (isCash && config_json_1.default.debugCashItems))
            logger.logWithColor(`${itemCount} x ${getName(newId)} ${itemCount * getPrice(newId)}`, LogTextColor_1.LogTextColor.CYAN);
        newBarterList.push({ _tpl: newId, count: itemCount });
        ongoingCost = Math.round(ongoingCost + cost);
        if ((ongoingCost * 1.3) > originalTotalCost)
            return newBarterList;
        return getNewBarterList(randomSeed + ongoingCost, ongoingCost, newBarterList, originalTotalCost, isCash, itemSet);
    };
    let tradeItemsChanged = 0;
    let cashItemsChanged = 0;
    let averageDeviation = 0;
    let averageCashDeviation = 0;
    Object.keys(traders).forEach((traderId) => {
        const trader = traders[traderId];
        const name = trader.base.nickname;
        if (!tradersToInclude.has(name)) {
            (config_json_1.default.printUnkownTraders && !BarterChangerUtils_1.knownInternalTraders.has(name)) && logger.logWithColor(`AlgorithmicBarterRandomizer: Unknown trader detected: ${name}`, LogTextColor_1.LogTextColor.MAGENTA);
            return;
        }
        if (config_json_1.default.enableHardcore) {
            //reduceTraderLoyaltySpendRequirement
            if (config_json_1.default.hardcoreSettings.reduceTraderLoyaltySpendRequirement) {
                trader.base?.loyaltyLevels.forEach((_, index) => {
                    if (trader.base?.loyaltyLevels[index].minSalesSum)
                        trader.base.loyaltyLevels[index].minSalesSum *= 0.15;
                });
            }
            //IncreaseMinBuyCounts
            if (config_json_1.default.hardcoreSettings.increaseMinBuyCounts) {
                trader?.assort?.items.forEach((_, index) => {
                    const restriction = trader?.assort?.items[index]?.upd?.BuyRestrictionMax;
                    if (restriction && restriction < 5)
                        trader.assort.items[index].upd.BuyRestrictionMax = 5;
                });
            }
            //reduceTraderBuyPrice
            if (config_json_1.default.hardcoreSettings.reduceTraderBuyPrice) {
                trader.base?.loyaltyLevels.forEach((_, index) => {
                    if (trader?.base?.loyaltyLevels?.[index])
                        trader.base.loyaltyLevels[index].buy_price_coef *= 1.5;
                });
            }
        }
        const barters = trader.assort.barter_scheme;
        Object.keys(barters).forEach(barterId => {
            const itemId = tradeItemMapper[barterId];
            const barter = barters[barterId];
            if (!barter?.[0]?.[0]?._tpl || !items?.[itemId]?._parent)
                return;
            const offer = ragFairServer.getOffer(barterId);
            let value = Math.max(offer.itemsCost, offer.summaryCost, getPrice(itemId));
            const originalValue = value;
            switch (true) {
                case BarterChangerUtils_1.moneyType.has(barter[0][0]._tpl): //MoneyValue
                    if (!config_json_1.default.enableHardcore || (0, utils_1.checkParentRecursive)(itemId, items, BarterChangerUtils_1.excludableCashParents))
                        break;
                    if (isNaN(value) || value < config_json_1.default.hardcoreSettings.cashItemCutoff)
                        break;
                    value *= config_json_1.default.cashBarterCostMultiplier;
                    config_json_1.default.debugCashItems && logger.logWithColor(`${getName(itemId)}`, LogTextColor_1.LogTextColor.YELLOW);
                    config_json_1.default.debugCashItems && logger.logWithColor(`${value} ${barter[0][0].count} ${getName(barter[0][0]._tpl)}`, LogTextColor_1.LogTextColor.BLUE);
                    const newCashBarter = getNewBarterList(barterId.replace(/[^a-z0-9-]/g, ''), undefined, undefined, value, true, new Set([itemId]));
                    if (!newCashBarter || !newCashBarter.length)
                        break;
                    let newCashCost = 0;
                    config_json_1.default.debugCashItems && newCashBarter.forEach(({ count, _tpl }) => {
                        newCashCost += (count * getPrice(_tpl));
                    });
                    const cashDeviation = Math.round((newCashCost > originalValue ?
                        (newCashCost - originalValue) / originalValue :
                        (originalValue - newCashCost) / originalValue) * 100) * (newCashCost > originalValue ? 1 : -1);
                    config_json_1.default.debugCashItems && logger.logWithColor(`${newCashCost > originalValue ? "MORE THAN" : "LESS THAN"} actual value ${cashDeviation}%\n`, newCashCost > originalValue ? LogTextColor_1.LogTextColor.RED : LogTextColor_1.LogTextColor.GREEN);
                    cashItemsChanged++;
                    averageCashDeviation += cashDeviation;
                    offer.requirements = newCashBarter.map((barterInfo) => ({ ...barterInfo, onlyFunctional: false }));
                    barter[0] = newCashBarter;
                    break;
                default:
                    value *= config_json_1.default.barterCostMultiplier;
                    config_json_1.default.debug && logger.logWithColor(`${getName(itemId)} - ${value}`, LogTextColor_1.LogTextColor.YELLOW);
                    let totalCost = 0;
                    barter[0].forEach(({ count, _tpl }) => {
                        config_json_1.default.debug && logger.logWithColor(`${count} x ${getName(_tpl)} ${getPrice(barter[0][0]._tpl)}`, LogTextColor_1.LogTextColor.MAGENTA);
                        totalCost += (count * getPrice(_tpl));
                    });
                    const newBarters = getNewBarterList((barterId + itemId).replace(/[^a-z0-9-]/g, ''), undefined, undefined, value, false, new Set([itemId]));
                    if (!newBarters || !newBarters.length)
                        break;
                    let newCost = 0;
                    config_json_1.default.debug && newBarters.forEach(({ count, _tpl }) => {
                        newCost += (count * getPrice(_tpl));
                    });
                    config_json_1.default.debug && logger.info(`original cost: ${totalCost} > new cost: ${newCost} > itemCost: ${value}`);
                    config_json_1.default.debug && logger.logWithColor(`${newCost > totalCost ? "INCREASED" : "DECREASED"} from original ${newCost > totalCost ? newCost - totalCost : totalCost - newCost}`, newCost > totalCost ? LogTextColor_1.LogTextColor.RED : LogTextColor_1.LogTextColor.GREEN);
                    const deviation = Math.round((newCost > originalValue ? (newCost - originalValue) / originalValue : (originalValue - newCost) / originalValue) * 100) * (newCost > originalValue ? 1 : -1);
                    averageDeviation += deviation;
                    config_json_1.default.debug && logger.logWithColor(`${newCost > originalValue ? "MORE THAN" : "LESS THAN"} actual value ${deviation}%`, newCost > originalValue ? LogTextColor_1.LogTextColor.RED : LogTextColor_1.LogTextColor.GREEN);
                    config_json_1.default.debug && console.log("\n");
                    tradeItemsChanged++;
                    offer.requirements = newBarters.map((barterInfo) => ({ ...barterInfo, onlyFunctional: false }));
                    barter[0] = newBarters;
                    break;
            }
        });
    });
    const finalCashDeviation = Math.round((averageCashDeviation / cashItemsChanged) * 100) / 100;
    config_json_1.default.debugCashItems && logger.logWithColor(`FinalCashDeviation ${finalCashDeviation}%\n`, LogTextColor_1.LogTextColor.YELLOW);
    const finalDeviation = Math.round((averageDeviation / tradeItemsChanged) * 100) / 100;
    config_json_1.default.debug && logger.logWithColor(`FinalDeviation ${finalDeviation}%\n`, LogTextColor_1.LogTextColor.YELLOW);
    logger.info(`AlgorithmicBarterRandomizer: Changed ${tradeItemsChanged} trade items and ${cashItemsChanged} cash items`);
}
exports.default = BarterChanger;
