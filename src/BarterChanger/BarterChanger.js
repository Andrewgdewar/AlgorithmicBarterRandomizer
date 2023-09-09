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
        // "Ragman",
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
    const getPrice = (id, reverse = false) => {
        if (reverse && handbookMapper[id] && !isNaN(handbookMapper[id]))
            return handbookMapper[id];
        if (prices[id] && !isNaN(prices[id]))
            return prices[id];
        if (handbookMapper[id] && !isNaN(handbookMapper[id]))
            return handbookMapper[id];
    };
    const cutLootList = [...filterLootList].sort((a, b) => getPrice(a) - getPrice(b));
    const getAlt = (randomSeed, totalCost, isCash = false) => {
        let maxKey = -1 + cutLootList.findIndex((id) => getPrice(id) > totalCost);
        if (maxKey >= 0 && maxKey < 5)
            maxKey = 10;
        if (maxKey < 0)
            maxKey = cutLootList.length - 1;
        if (!cutLootList[maxKey]) {
            logger.error(`Unable to find 'cutLootList[maxKey]' `);
            return "";
        }
        let minKey = Math.round(maxKey * (isCash ? 0.7 : (maxKey > 200 ? 0.9 : 0.4)));
        const newKey = (0, utils_1.seededRandom)(minKey, maxKey, randomSeed);
        const newId = cutLootList[newKey];
        // console.log(minKey, maxKey, totalCost, prices[newId], getName(newId))
        if (!newId) {
            logger.error(`Unable to find 'newId' random seed ${randomSeed} new key${newKey} ${minKey}${maxKey}`);
            return "";
        }
        return newId;
    };
    const getNewBarterList = (randomSeed, ongoingCost = 0, newBarterList = [], originalTotalCost, isCash = false) => {
        const { ongoing, multiplier } = BarterChangerUtils_1.difficulties[config_json_1.default.difficulty];
        const totalRemaining = originalTotalCost - ongoingCost;
        const newId = getAlt(randomSeed, totalRemaining, isCash);
        if (!newId)
            return undefined;
        const multipliedValue = multiplier * getPrice(newId);
        let itemCount = Math.round(totalRemaining / multipliedValue) || 1;
        if (itemCount > 15)
            itemCount = 15;
        if (!newBarterList.length && itemCount > 5 && itemCount < 15) {
            itemCount = 5;
        }
        const cost = multipliedValue * itemCount;
        //getName(newId) + cost
        if (config_json_1.default.debug || (isCash && config_json_1.default.debugCashItems))
            logger.logWithColor(`${itemCount} x ${getName(newId)} ${itemCount * getPrice(newId)}`, LogTextColor_1.LogTextColor.GREEN);
        newBarterList.push({ _tpl: newId, count: itemCount });
        ongoingCost = Math.round(ongoingCost + cost);
        if ((ongoingCost * ongoing) > originalTotalCost)
            return newBarterList;
        return getNewBarterList(randomSeed + ongoingCost, ongoingCost, newBarterList, originalTotalCost, isCash);
    };
    let tradeItemsChanged = 0;
    let cashItemsChanged = 0;
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
                        trader.base.loyaltyLevels[index].minSalesSum *= 0.2;
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
        const tradeItemMapper = {};
        trader.assort.items.forEach(item => {
            tradeItemMapper[item._id] = item._tpl;
        });
        Object.keys(barters).forEach(barterId => {
            const itemId = tradeItemMapper[barterId];
            const barter = barters[barterId];
            if (!barter?.[0]?.[0]?._tpl)
                return;
            const offer = ragFairServer.getOffer(barterId);
            let value = getPrice(itemId);
            switch (true) {
                case BarterChangerUtils_1.moneyType.has(barter[0][0]._tpl): //MoneyValue
                    if (!config_json_1.default.enableHardcore || (0, utils_1.checkParentRecursive)(itemId, items, BarterChangerUtils_1.excludableCashParents))
                        break;
                    if (isNaN(value))
                        value = barter[0][0].count;
                    if (isNaN(value))
                        break;
                    if (getPrice(itemId, true) < config_json_1.default.hardcoreSettings.cashItemCutoff)
                        return;
                    config_json_1.default.debugCashItems && logger.logWithColor(`${getName(itemId)}`, LogTextColor_1.LogTextColor.YELLOW);
                    config_json_1.default.debugCashItems && logger.logWithColor(`${value} ${barter[0][0].count} ${getName(barter[0][0]._tpl)}`, LogTextColor_1.LogTextColor.BLUE);
                    const newCashBarter = getNewBarterList(barterId.replace(/[^a-z0-9-]/g, ''), undefined, undefined, value, true);
                    config_json_1.default.debugCashItems && console.log("\n");
                    if (!newCashBarter || !newCashBarter.length)
                        break;
                    cashItemsChanged++;
                    offer.requirements = newCashBarter.map((barterInfo) => ({ ...barterInfo, onlyFunctional: false }));
                    barter[0] = newCashBarter;
                    break;
                default:
                    config_json_1.default.debug && logger.logWithColor(`${getName(itemId)}`, LogTextColor_1.LogTextColor.YELLOW);
                    let totalCost = 0;
                    barter[0].forEach(({ count, _tpl }) => {
                        if (BarterChangerUtils_1.excludedItemsList.has(_tpl))
                            return;
                        config_json_1.default.debug && logger.logWithColor(`${count} x ${getName(_tpl)}`, LogTextColor_1.LogTextColor.BLUE);
                        totalCost += (count * getPrice(_tpl));
                    });
                    config_json_1.default.debug && logger.info(`========================= original cost ${totalCost} Actual cost > ${value}`);
                    if (isNaN(value)) {
                        config_json_1.default.debug && logger.info(`No price info attempting override`);
                        if (!isNaN(totalCost))
                            value = totalCost;
                        else
                            return config_json_1.default.debug && logger.info(`Unable to Override!!!! Skipping`);
                    }
                    const newBarters = getNewBarterList(barterId.replace(/[^a-z0-9-]/g, ''), undefined, undefined, value);
                    config_json_1.default.debug && console.log("\n");
                    if (!newBarters || !newBarters.length)
                        break;
                    tradeItemsChanged++;
                    offer.requirements = newBarters.map((barterInfo) => ({ ...barterInfo, onlyFunctional: false }));
                    barter[0] = newBarters;
                    break;
            }
        });
    });
    logger.info(`AlgorithmicBarterRandomizer: Changed ${tradeItemsChanged} trade items and ${cashItemsChanged} cash items`);
}
exports.default = BarterChanger;
