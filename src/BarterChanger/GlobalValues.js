"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalValues = void 0;
const config_json_1 = __importDefault(require("../../config/config.json"));
const utils_1 = require("../utils");
const BarterChangerUtils_1 = require("./BarterChangerUtils");
const LogTextColor_1 = require("C:/snapshot/project/obj/models/spt/logging/LogTextColor");
class globalValues {
    static traderController;
    static Logger;
    static tables;
    static RagfairPriceService;
    static RagfairOfferService;
    static TraderAssortService;
    static RagfairRequiredItemsService;
    static config = config_json_1.default;
    static timeUntilNextUpdate = Date.now();
    static pendingCountDown = false;
    // public static updatePrices() {
    //   const tables = this.tables;
    //   const prices = this.RagfairOfferService.getOffers();
    //   const items = tables.templates.items;
    // }
    static updateBarters(time) {
        if (time) {
            if (this.pendingCountDown)
                return;
            const now = Date.now() / 1000;
            if (time < now)
                return this.updateBarters();
            const timeDiff = (time - now - 1) * 1000;
            this.config.debug &&
                console.log("Will update barters in", Math.round((timeDiff / 1000 / 60) * 100) / 100, "Minutes");
            this.pendingCountDown = true;
            return setTimeout(() => {
                this.pendingCountDown = false;
                this.updateBarters();
            }, timeDiff);
        }
        const tables = this.tables;
        const items = tables.templates.items;
        const flee = tables.globals.config.RagFair;
        const prices = tables.templates.prices;
        const traders = tables.traders;
        const locations = tables.locations;
        const handbook = tables.templates.handbook;
        const locales = tables.locales;
        const local = locales.global.en;
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
            "БТР",
            ...config_json_1.default.customTradersToInclude,
        ]);
        const lootmap = {};
        for (const map in locations) {
            const location = locations[map];
            if (!location?.staticLoot)
                continue;
            const loot = [
                ...Object.values(location.staticLoot)
                    .map(({ itemDistribution }) => itemDistribution)
                    .flat(1),
            ];
            loot.forEach(({ tpl, relativeProbability }) => {
                if (!lootmap[tpl])
                    lootmap[tpl] = relativeProbability;
                else
                    lootmap[tpl] = relativeProbability + lootmap[tpl];
            });
        }
        const filterLootList = Object.keys(lootmap).filter((id) => {
            const result = !(0, utils_1.checkParentRecursive)(id, items, BarterChangerUtils_1.excludableParents);
            if (result)
                delete lootmap[id];
            return result;
        });
        // saveToFile(lootmap, "lootlist.json");
        // return;
        const getName = (id) => {
            const itemNameId = `${id} Name`;
            const itemShortNameId = `${id} ShortName`;
            return `${local[itemNameId]} (${local[itemShortNameId]})`;
        };
        const handbookMapper = {};
        handbook.Items.forEach(({ Id, Price }) => {
            handbookMapper[Id] = Price;
        });
        const getFleaPrice = (itemID) => {
            if (typeof prices[itemID] != "undefined") {
                return prices[itemID];
            }
            else {
                return handbookMapper[itemID];
            }
        };
        const tradeItemMapper = {};
        Object.keys(traders).forEach((traderId) => {
            const trader = traders[traderId];
            if (!tradersToInclude.has(trader.base.nickname))
                return;
            trader?.assort?.items.forEach((item) => {
                tradeItemMapper[item._id] = item._tpl;
            });
        });
        const getPrice = (id, reverse = false) => {
            let multiplier = 1;
            if (!items[id]._props.CanSellOnRagfair)
                multiplier *= 2;
            const handbookVal = this.RagfairPriceService.getStaticPriceForItem(id); //handbookMapper[id];
            const fleaVal = this.RagfairPriceService.getFleaPriceForItem(id); // prices[id];
            // const pulledValue =
            switch (true) {
                case reverse &&
                    !!fleaVal &&
                    !isNaN(fleaVal) &&
                    handbookVal &&
                    !isNaN(handbookVal):
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
            const filteredLootList = cutLootList.filter((id) => !itemSet.has(id) &&
                !BarterChangerUtils_1.excludedItemsList.has(id) &&
                !BarterChangerUtils_1.excludedItemsList.has(items[id]._parent));
            let maxKey = filteredLootList.findIndex((id) => getPrice(id) > totalCost);
            if (maxKey < 0)
                maxKey = filteredLootList.length - 1;
            if (maxKey < 20)
                maxKey = 20;
            let minKey = maxKey === filteredLootList.length - 1 ? maxKey - 50 : maxKey - 20;
            if (minKey < 0)
                minKey = 0;
            const newKey = (0, utils_1.seededRandom)(minKey, maxKey, randomSeed);
            const newId = filteredLootList[newKey];
            if (!newId) {
                this.Logger.error(`Unable to find 'newId' random seed ${randomSeed} new key${newKey} ${minKey}${maxKey}`);
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
            let itemCount = Math.round(totalRemaining / value) || 1;
            if (itemCount > 15)
                itemCount = 15;
            const cost = value * itemCount;
            if (config_json_1.default.debug || (isCash && config_json_1.default.debugCashItems))
                this.Logger.logWithColor(`${itemCount} x ${getName(newId)} ${itemCount * getPrice(newId)}`, LogTextColor_1.LogTextColor.CYAN);
            newBarterList.push({ _tpl: newId, count: itemCount });
            ongoingCost = Math.round(ongoingCost + cost);
            if (ongoingCost * 1.3 > originalTotalCost)
                return newBarterList;
            return getNewBarterList(randomSeed + ongoingCost, ongoingCost, newBarterList, originalTotalCost, isCash, itemSet);
        };
        const allOffers = this.RagfairOfferService.getOffers().filter((offer) => offer.user.memberType === 4);
        const getTradeOfferId = (offers, targetItem, originalFirstTradeId) => {
            const offer = offers.find((offer) => offer.items[0]._tpl === targetItem &&
                offer.requirements[0]._tpl === originalFirstTradeId);
            return offer?._id;
        };
        let tradeItemsChanged = 0;
        let cashItemsChanged = 0;
        let averageDeviation = 0;
        let averageCashDeviation = 0;
        const handbookIDsToUpdate = new Set();
        Object.keys(traders).forEach((traderId) => {
            // START
            const trader = traders[traderId];
            const traderName = trader.base.nickname;
            if (!tradersToInclude.has(traderName)) {
                config_json_1.default.printUnkownTraders &&
                    !BarterChangerUtils_1.knownInternalTraders.has(traderName) &&
                    this.Logger.logWithColor(`AlgorithmicBarterRandomizer: Unknown trader detected: ${traderName}`, LogTextColor_1.LogTextColor.MAGENTA);
                return;
            }
            const traderBartersOnFlea = allOffers.filter((offer) => offer.user.id === traderId &&
                !BarterChangerUtils_1.moneyType.has(offer.requirements[0]._tpl));
            const traderCashOnFlea = allOffers.filter((offer) => offer.user.id === traderId &&
                BarterChangerUtils_1.moneyType.has(offer.requirements[0]._tpl));
            if (config_json_1.default.enableHardcore) {
                //reduceTraderLoyaltySpendRequirement
                if (config_json_1.default.hardcoreSettings.reduceTraderLoyaltySpendRequirement) {
                    trader.base?.loyaltyLevels.forEach((_, index) => {
                        if (trader.base?.loyaltyLevels[index].minSalesSum)
                            traders[traderId].base.loyaltyLevels[index].minSalesSum =
                                index * 100000;
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
                            trader.base.loyaltyLevels[index].buy_price_coef = 75;
                    });
                }
            }
            const seen = new Set();
            traderCashOnFlea.forEach((offer) => {
                if (offer?.items?.[0]?._tpl) {
                    if (!seen.has(offer.items[0]._tpl) &&
                        (0, utils_1.checkParentRecursive)(offer.items[0]._tpl, items, [BarterChangerUtils_1.ammoParent])) {
                        seen.add(offer.items[0]._tpl);
                        offer.requirements[0].count =
                            offer.requirements[0].count * BarterChangerUtils_1.bulletCostMultiplier;
                        this.RagfairOfferService.addOffer(offer);
                    }
                }
            });
            const barters = trader.assort.barter_scheme;
            Object.keys(barters).forEach((barterId) => {
                const itemId = tradeItemMapper[barterId];
                const barter = barters[barterId];
                if (!barter?.[0]?.[0]?._tpl || !items?.[itemId]?._parent)
                    return;
                const originalValue = getFleaPrice(itemId);
                const value = originalValue * config_json_1.default.barterCostMultiplier;
                switch (true) {
                    case BarterChangerUtils_1.moneyType.has(barter[0][0]._tpl): //MoneyValue
                        if (!config_json_1.default.enableHardcore ||
                            (0, utils_1.checkParentRecursive)(itemId, items, BarterChangerUtils_1.excludableCashParents)) {
                            if ((0, utils_1.checkParentRecursive)(itemId, items, [BarterChangerUtils_1.ammoParent])) {
                                barter[0][0].count = barter[0][0].count * BarterChangerUtils_1.bulletCostMultiplier;
                            }
                            break;
                        }
                        // if (originalValue < config.hardcoreSettings.cashItemCutoff) break;
                        const cashOfferId = getTradeOfferId(traderCashOnFlea, itemId, barter[0][0]._tpl);
                        if (!cashOfferId) {
                            this.Logger.info(`Unable to find Flea Offer for item: ${items[itemId]?._name} sold by ${traderName}`);
                            break;
                        }
                        // config.debugCashItems &&
                        //   this.Logger.logWithColor(
                        //     `${getName(itemId)}`,
                        //     LogTextColor.YELLOW
                        //   );
                        // config.debugCashItems &&
                        //   this.Logger.logWithColor(
                        //     `${value} ${barter[0][0].count} ${getName(barter[0][0]._tpl)}`,
                        //     LogTextColor.BLUE
                        //   );
                        const newCashBarter = getNewBarterList(barterId.replace(/[^a-z0-9-]/g, ""), undefined, undefined, value, true, new Set([itemId]));
                        if (!newCashBarter || !newCashBarter.length)
                            break;
                        let newCashCost = 0;
                        config_json_1.default.debugCashItems &&
                            newCashBarter.forEach(({ count, _tpl }) => {
                                newCashCost += count * getPrice(_tpl);
                            });
                        const cashDeviation = Math.round((newCashCost > originalValue
                            ? (newCashCost - originalValue) / originalValue
                            : (originalValue - newCashCost) / originalValue) * 100) * (newCashCost > originalValue ? 1 : -1);
                        config_json_1.default.debugCashItems &&
                            this.Logger.logWithColor(`${newCashCost > originalValue ? "MORE THAN" : "LESS THAN"} actual value ${cashDeviation}%\n`, newCashCost > originalValue
                                ? LogTextColor_1.LogTextColor.RED
                                : LogTextColor_1.LogTextColor.GREEN);
                        cashItemsChanged++;
                        const cashOfferForUpdate = this.RagfairOfferService.getOfferByOfferId(cashOfferId);
                        averageCashDeviation += cashDeviation;
                        cashOfferForUpdate.requirements = newCashBarter.map((barterInfo) => ({
                            ...barterInfo,
                            onlyFunctional: false,
                        }));
                        barter[0] = newCashBarter;
                        break;
                    default:
                        config_json_1.default.debug &&
                            this.Logger.logWithColor(`${getName(itemId)} - ${value}`, LogTextColor_1.LogTextColor.YELLOW);
                        let totalCost = 0;
                        barter[0].forEach(({ count, _tpl }) => {
                            config_json_1.default.debug &&
                                this.Logger.logWithColor(`${count} x ${getName(_tpl)} ${getPrice(barter[0][0]._tpl)}`, LogTextColor_1.LogTextColor.MAGENTA);
                            totalCost += count * getPrice(_tpl);
                        });
                        const offerId = getTradeOfferId(traderBartersOnFlea, itemId, barter[0][0]._tpl);
                        if (!offerId) {
                            this.Logger.info(`Unable to find Flea Offer for item: ${items[itemId]?._name} bartered by ${traderName}`);
                            break;
                        }
                        const newBarters = getNewBarterList((barterId + itemId).replace(/[^a-z0-9-]/g, ""), undefined, undefined, value, false, new Set([itemId]));
                        if (!newBarters || !newBarters.length)
                            break;
                        let newCost = 0;
                        config_json_1.default.debug &&
                            newBarters.forEach(({ count, _tpl }) => {
                                newCost += count * getPrice(_tpl);
                            });
                        config_json_1.default.debug &&
                            this.Logger.info(`original cost: ${totalCost} > new cost: ${newCost} > itemCost: ${value}`);
                        config_json_1.default.debug &&
                            this.Logger.logWithColor(`${newCost > totalCost ? "INCREASED" : "DECREASED"} from original ${newCost > totalCost
                                ? newCost - totalCost
                                : totalCost - newCost}`, newCost > totalCost ? LogTextColor_1.LogTextColor.RED : LogTextColor_1.LogTextColor.GREEN);
                        const deviation = Math.round((newCost > originalValue
                            ? (newCost - originalValue) / originalValue
                            : (originalValue - newCost) / originalValue) * 100) * (newCost > originalValue ? 1 : -1);
                        averageDeviation += deviation;
                        config_json_1.default.debug &&
                            this.Logger.logWithColor(`${newCost > originalValue ? "MORE THAN" : "LESS THAN"} actual value ${deviation}%`, newCost > originalValue ? LogTextColor_1.LogTextColor.RED : LogTextColor_1.LogTextColor.GREEN);
                        const actualOfferForUpdate = this.RagfairOfferService.getOfferByOfferId(offerId);
                        if (!actualOfferForUpdate)
                            this.Logger.info(`Unable to find: ${items[itemId]?._name} bartered by ${traderName}`);
                        config_json_1.default.debug && console.log("\n");
                        tradeItemsChanged++;
                        actualOfferForUpdate.requirements = newBarters.map((barterInfo) => ({
                            ...barterInfo,
                            onlyFunctional: false,
                        }));
                        barter[0] = newBarters;
                        break;
                }
            });
            this.TraderAssortService.setPristineTraderAssort(traderId, trader.assort);
        });
        const finalCashDeviation = Math.round((averageCashDeviation / cashItemsChanged) * 100) / 100;
        config_json_1.default.debugCashItems &&
            this.Logger.logWithColor(`FinalCashDeviation ${finalCashDeviation}%\n`, LogTextColor_1.LogTextColor.YELLOW);
        const finalDeviation = Math.round((averageDeviation / tradeItemsChanged) * 100) / 100;
        config_json_1.default.debug &&
            this.Logger.logWithColor(`FinalDeviation ${finalDeviation}%\n`, LogTextColor_1.LogTextColor.YELLOW);
        this.Logger.info(`AlgorthimicBarterChanger: Updated ${tradeItemsChanged + cashItemsChanged} item barters`);
        this.RagfairOfferService.addPlayerOffers();
        this.RagfairRequiredItemsService.buildRequiredItemTable();
        this.traderController.update();
    }
}
exports.globalValues = globalValues;
//# sourceMappingURL=GlobalValues.js.map