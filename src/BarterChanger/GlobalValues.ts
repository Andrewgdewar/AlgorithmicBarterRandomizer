import { ILogger } from "@spt/models/spt/utils/ILogger";
import { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import config from "../../config/config.json";
import { checkParentRecursive, saveToFile, seededRandom } from "../utils";
import {
  ammoParent,
  bulletCostMultiplier,
  excludableCashParents,
  excludableParents,
  excludedItemsList,
  knownInternalTraders,
  moneyType,
  turnToCashType,
} from "./BarterChangerUtils";
import { IBarterScheme } from "@spt/models/eft/common/tables/ITrader";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { RagfairOfferService } from "@spt/services/RagfairOfferService";
import { IRagfairOffer } from "@spt/models/eft/ragfair/IRagfairOffer";
import { TraderController } from "@spt/controllers/TraderController";
import { ILocation } from "@spt/models/eft/common/ILocation";
import { RagfairPriceService } from "@spt/services/RagfairPriceService";
import { RagfairRequiredItemsService } from "@spt/services/RagfairRequiredItemsService";
import { TraderAssortService } from "@spt/services/TraderAssortService";

export class globalValues {
  public static traderController: TraderController;
  public static Logger: ILogger;
  public static tables: IDatabaseTables;
  public static RagfairPriceService: RagfairPriceService;
  public static RagfairOfferService: RagfairOfferService;
  public static TraderAssortService: TraderAssortService;
  public static RagfairRequiredItemsService: RagfairRequiredItemsService;
  public static config = config;
  public static timeUntilNextUpdate = Date.now();
  public static pendingCountDown = false;

  // public static updatePrices() {
  //   const tables = this.tables;
  //   const prices = this.RagfairOfferService.getOffers();
  //   const items = tables.templates.items;
  // }

  public static updateBarters(time?: number) {
    if (time) {
      if (this.pendingCountDown) return;
      const now = Date.now() / 1000;
      if (time < now) return this.updateBarters();
      const timeDiff = (time - now - 1) * 1000;
      this.config.debug &&
        console.log(
          "Will update barters in",
          Math.round((timeDiff / 1000 / 60) * 100) / 100,
          "Minutes"
        );
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

    if (config.enableHardcore && config.hardcoreSettings.disableFlee)
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
      ...config.customTradersToInclude,
    ]);

    const lootmap: Record<string, number> = {};

    for (const map in locations) {
      const location: ILocation = locations[map];
      if (!location?.staticLoot) continue;
      const loot = [
        ...Object.values(location.staticLoot)
          .map(({ itemDistribution }) => itemDistribution)
          .flat(1),
      ];
      loot.forEach(({ tpl, relativeProbability }) => {
        if (!lootmap[tpl]) lootmap[tpl] = relativeProbability;
        else lootmap[tpl] = relativeProbability + lootmap[tpl];
      });
    }

    const filterLootList = Object.keys(lootmap).filter((id) => {
      const result = !checkParentRecursive(id, items, excludableParents);
      if (result) delete lootmap[id];
      return result;
    });

    // saveToFile(lootmap, "lootlist.json");
    // return;
    const getName = (id: string) => {
      const itemNameId = `${id} Name`;
      const itemShortNameId = `${id} ShortName`;
      return `${local[itemNameId]} (${local[itemShortNameId]})`;
    };

    const handbookMapper = {} as Record<string, number>;

    handbook.Items.forEach(({ Id, Price }) => {
      handbookMapper[Id] = Price;
    });

    const getFleaPrice = (itemID: string): number => {
      if (typeof prices[itemID] != "undefined") {
        return prices[itemID];
      } else {
        return handbookMapper[itemID];
      }
    };

    const tradeItemMapper = {};

    Object.keys(traders).forEach((traderId) => {
      const trader = traders[traderId];
      if (!tradersToInclude.has(trader.base.nickname)) return;
      trader?.assort?.items.forEach((item) => {
        tradeItemMapper[item._id] = item._tpl;
      });
    });

    const getPrice = (id: string, reverse = false): number | undefined => {
      let multiplier = 1;
      if (!items[id]._props.CanSellOnRagfair) multiplier *= 2;
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

    const cutLootList = [...filterLootList].sort(
      (a, b) => getPrice(a) - getPrice(b)
    );

    const getAlt = (
      randomSeed: string,
      totalCost: number,
      itemSet: Set<string>
    ) => {
      const filteredLootList = cutLootList.filter(
        (id) =>
          !itemSet.has(id) &&
          !excludedItemsList.has(id) &&
          !excludedItemsList.has(items[id]._parent)
      );
      let maxKey = filteredLootList.findIndex((id) => getPrice(id) > totalCost);
      if (maxKey < 0) maxKey = filteredLootList.length - 1;
      if (maxKey < 20) maxKey = 20;
      let minKey =
        maxKey === filteredLootList.length - 1 ? maxKey - 50 : maxKey - 20;
      if (minKey < 0) minKey = 0;

      const newKey = seededRandom(minKey, maxKey, randomSeed);
      const newId = filteredLootList[newKey];

      if (!newId) {
        this.Logger.error(
          `Unable to find 'newId' random seed ${randomSeed} new key${newKey} ${minKey}${maxKey}`
        );
        return "";
      }
      return newId;
    };

    const getNewBarterList = (
      randomSeed: string,
      ongoingCost: number = 0,
      newBarterList: IBarterScheme[] = [],
      originalTotalCost: number,
      isCash: boolean = false,
      itemSet: Set<string>
    ) => {
      const totalRemaining = originalTotalCost - ongoingCost;
      const newId = getAlt(randomSeed, totalRemaining, itemSet);
      if (!newId) return undefined;
      itemSet.add(newId);
      const value = getPrice(newId);
      let itemCount = Math.round(totalRemaining / value) || 1;
      if (itemCount > 15) itemCount = 15;

      const cost = value * itemCount;

      if (config.debug || (isCash && config.debugCashItems))
        this.Logger.logWithColor(
          `${itemCount} x ${getName(newId)} ${itemCount * getPrice(newId)}`,
          LogTextColor.CYAN
        );
      newBarterList.push({ _tpl: newId, count: itemCount });

      ongoingCost = Math.round(ongoingCost + cost);

      if (ongoingCost * 1.3 > originalTotalCost) return newBarterList;

      return getNewBarterList(
        randomSeed + ongoingCost,
        ongoingCost,
        newBarterList,
        originalTotalCost,
        isCash,
        itemSet
      );
    };

    const allOffers = this.RagfairOfferService.getOffers().filter(
      (offer) => offer.user.memberType === 4
    );

    const getTradeOfferId = (
      offers: IRagfairOffer[],
      targetItem: string,
      originalFirstTradeId: string
    ): string | undefined => {
      const offer = offers.find(
        (offer) =>
          offer.items[0]._tpl === targetItem &&
          offer.requirements[0]._tpl === originalFirstTradeId
      );
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
        config.printUnkownTraders &&
          !knownInternalTraders.has(traderName) &&
          this.Logger.logWithColor(
            `AlgorithmicBarterRandomizer: Unknown trader detected: ${traderName}`,
            LogTextColor.MAGENTA
          );
        return;
      }

      const traderBartersOnFlea = allOffers.filter(
        (offer) =>
          offer.user.id === traderId &&
          !moneyType.has(offer.requirements[0]._tpl)
      );

      const traderCashOnFlea = allOffers.filter(
        (offer) =>
          offer.user.id === traderId &&
          moneyType.has(offer.requirements[0]._tpl)
      );

      if (config.enableHardcore) {
        //reduceTraderLoyaltySpendRequirement
        if (config.hardcoreSettings.reduceTraderLoyaltySpendRequirement) {
          trader.base?.loyaltyLevels.forEach((_, index) => {
            if (trader.base?.loyaltyLevels[index].minSalesSum)
              traders[traderId].base.loyaltyLevels[index].minSalesSum =
                index * 100000;
          });
        }

        //IncreaseMinBuyCounts
        if (config.hardcoreSettings.increaseMinBuyCounts) {
          trader?.assort?.items.forEach((_, index) => {
            const restriction =
              trader?.assort?.items[index]?.upd?.BuyRestrictionMax;
            if (restriction && restriction < 5)
              trader.assort.items[index].upd.BuyRestrictionMax = 5;
          });
        }

        //reduceTraderBuyPrice
        if (config.hardcoreSettings.reduceTraderBuyPrice) {
          trader.base?.loyaltyLevels.forEach((_, index) => {
            if (trader?.base?.loyaltyLevels?.[index])
              trader.base.loyaltyLevels[index].buy_price_coef = 75;
          });
        }
      }

      const seen = new Set();
      traderCashOnFlea.forEach((offer) => {
        if (offer?.items?.[0]?._tpl) {
          if (
            !seen.has(offer.items[0]._tpl) &&
            checkParentRecursive(offer.items[0]._tpl, items, [ammoParent])
          ) {
            seen.add(offer.items[0]._tpl);
            offer.requirements[0].count =
              offer.requirements[0].count * bulletCostMultiplier;
            this.RagfairOfferService.addOffer(offer);
          }
        }
      });

      const barters = trader.assort.barter_scheme;
      Object.keys(barters).forEach((barterId) => {
        const itemId = tradeItemMapper[barterId];
        const barter = barters[barterId];
        if (!barter?.[0]?.[0]?._tpl || !items?.[itemId]?._parent) return;
        const originalValue = getFleaPrice(itemId);
        const value = originalValue * config.barterCostMultiplier;

        switch (true) {
          case moneyType.has(barter[0][0]._tpl): //MoneyValue
            if (
              !config.enableHardcore ||
              checkParentRecursive(itemId, items, excludableCashParents)
            ) {
              if (checkParentRecursive(itemId, items, [ammoParent])) {
                barter[0][0].count = barter[0][0].count * bulletCostMultiplier;
              }
              break;
            }

            // if (originalValue < config.hardcoreSettings.cashItemCutoff) break;

            const cashOfferId = getTradeOfferId(
              traderCashOnFlea,
              itemId,
              barter[0][0]._tpl
            );

            if (!cashOfferId) {
              this.Logger.info(
                `Unable to find Flea Offer for item: ${items[itemId]?._name} sold by ${traderName}`
              );
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

            const newCashBarter = getNewBarterList(
              barterId.replace(/[^a-z0-9-]/g, ""),
              undefined,
              undefined,
              value,
              true,
              new Set([itemId])
            );

            if (!newCashBarter || !newCashBarter.length) break;

            let newCashCost = 0;

            config.debugCashItems &&
              newCashBarter.forEach(({ count, _tpl }) => {
                newCashCost += count * getPrice(_tpl);
              });

            const cashDeviation =
              Math.round(
                (newCashCost > originalValue
                  ? (newCashCost - originalValue) / originalValue
                  : (originalValue - newCashCost) / originalValue) * 100
              ) * (newCashCost > originalValue ? 1 : -1);

            config.debugCashItems &&
              this.Logger.logWithColor(
                `${
                  newCashCost > originalValue ? "MORE THAN" : "LESS THAN"
                } actual value ${cashDeviation}%\n`,
                newCashCost > originalValue
                  ? LogTextColor.RED
                  : LogTextColor.GREEN
              );

            cashItemsChanged++;
            const cashOfferForUpdate =
              this.RagfairOfferService.getOfferByOfferId(cashOfferId);

            averageCashDeviation += cashDeviation;

            cashOfferForUpdate.requirements = newCashBarter.map(
              (barterInfo: { _tpl: string; count: number }) => ({
                ...barterInfo,
                onlyFunctional: false,
              })
            );

            barter[0] = newCashBarter;
            break;
          case checkParentRecursive(itemId, items, turnToCashType):
            let price = getPrice(itemId);
            // console.log(items[itemId]._name, price);
            const isUSD = trader.base.currency === "USD";
            if (isUSD) {
              price = Math.round(price / 151);
            }
            const traderCurrency = isUSD
              ? "5696686a4bdc2da3298b456a"
              : "5449016a4bdc2d6f028b456f";
            const toCashOfferId = getTradeOfferId(
              traderBartersOnFlea,
              itemId,
              barter[0][0]._tpl
            );
            const offerForUpdate =
              this.RagfairOfferService.getOfferByOfferId(toCashOfferId);
            offerForUpdate.requirements = [
              {
                _tpl: traderCurrency,
                count: price,
                onlyFunctional: false,
              },
            ];
            this.RagfairOfferService.addOffer(offerForUpdate);
            barter[0] = [{ _tpl: traderCurrency, count: price }];

            break;
          default:
            break;
            config.debug &&
              this.Logger.logWithColor(
                `${getName(itemId)} - ${value}`,
                LogTextColor.YELLOW
              );

            let totalCost = 0;

            barter[0].forEach(({ count, _tpl }) => {
              config.debug &&
                this.Logger.logWithColor(
                  `${count} x ${getName(_tpl)} ${getPrice(barter[0][0]._tpl)}`,
                  LogTextColor.MAGENTA
                );
              totalCost += count * getPrice(_tpl);
            });

            const offerId = getTradeOfferId(
              traderBartersOnFlea,
              itemId,
              barter[0][0]._tpl
            );

            if (!offerId) {
              this.Logger.info(
                `Unable to find Flea Offer for item: ${items[itemId]?._name} bartered by ${traderName}`
              );
              break;
            }

            const newBarters = getNewBarterList(
              (barterId + itemId).replace(/[^a-z0-9-]/g, ""),
              undefined,
              undefined,
              value,
              false,
              new Set([itemId])
            );

            if (!newBarters || !newBarters.length) break;

            let newCost = 0;

            config.debug &&
              newBarters.forEach(({ count, _tpl }) => {
                newCost += count * getPrice(_tpl);
              });

            config.debug &&
              this.Logger.info(
                `original cost: ${totalCost} > new cost: ${newCost} > itemCost: ${value}`
              );

            config.debug &&
              this.Logger.logWithColor(
                `${
                  newCost > totalCost ? "INCREASED" : "DECREASED"
                } from original ${
                  newCost > totalCost
                    ? newCost - totalCost
                    : totalCost - newCost
                }`,
                newCost > totalCost ? LogTextColor.RED : LogTextColor.GREEN
              );

            const deviation =
              Math.round(
                (newCost > originalValue
                  ? (newCost - originalValue) / originalValue
                  : (originalValue - newCost) / originalValue) * 100
              ) * (newCost > originalValue ? 1 : -1);

            averageDeviation += deviation;

            config.debug &&
              this.Logger.logWithColor(
                `${
                  newCost > originalValue ? "MORE THAN" : "LESS THAN"
                } actual value ${deviation}%`,
                newCost > originalValue ? LogTextColor.RED : LogTextColor.GREEN
              );

            const actualOfferForUpdate =
              this.RagfairOfferService.getOfferByOfferId(offerId);

            if (!actualOfferForUpdate)
              this.Logger.info(
                `Unable to find: ${items[itemId]?._name} bartered by ${traderName}`
              );

            config.debug && console.log("\n");

            tradeItemsChanged++;

            actualOfferForUpdate.requirements = newBarters.map(
              (barterInfo: { _tpl: string; count: number }) => ({
                ...barterInfo,
                onlyFunctional: false,
              })
            );

            barter[0] = newBarters;

            break;
        }
      });
      this.TraderAssortService.setPristineTraderAssort(traderId, trader.assort);
    });

    const finalCashDeviation =
      Math.round((averageCashDeviation / cashItemsChanged) * 100) / 100;
    config.debugCashItems &&
      this.Logger.logWithColor(
        `FinalCashDeviation ${finalCashDeviation}%\n`,
        LogTextColor.YELLOW
      );

    const finalDeviation =
      Math.round((averageDeviation / tradeItemsChanged) * 100) / 100;
    config.debug &&
      this.Logger.logWithColor(
        `FinalDeviation ${finalDeviation}%\n`,
        LogTextColor.YELLOW
      );

    this.Logger.info(
      `AlgorthimicBarterChanger: Updated ${
        tradeItemsChanged + cashItemsChanged
      } item barters`
    );

    this.RagfairOfferService.addPlayerOffers();
    this.RagfairRequiredItemsService.buildRequiredItemTable();
    this.traderController.update();
  }
}
