import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { IDatabaseTables } from "@spt-aki/models/spt/server/IDatabaseTables";
import config from "../../config/config.json"
import { RagfairServer } from '@spt-aki/servers/RagfairServer';
import { checkParentRecursive, seededRandom } from "../utils";
import { excludableCashParents, excludableParents, excludedItemsList, knownInternalTraders, moneyType } from "./BarterChangerUtils";
import { IBarterScheme } from "@spt-aki/models/eft/common/tables/ITrader";
import { LogTextColor } from "@spt-aki/models/spt/logging/LogTextColor";

export class globalValues {
    public static Logger: ILogger;
    public static tables: IDatabaseTables;
    public static ragFairServer: RagfairServer
    public static config = config

    public static updateBarters() {
        const tables = this.tables

        const items = tables.templates.items;
        const flee = tables.globals.config.RagFair;
        const prices = tables.templates.prices
        const traders = tables.traders
        const loot = tables.loot.staticLoot
        const handbook = tables.templates.handbook
        const locales = tables.locales
        const local = locales.global.en

        if (config.enableHardcore && config.hardcoreSettings.disableFlee) flee.minUserLevel = 99

        const tradersToInclude = new Set([
            "Prapor",
            "Therapist",
            "Skier",
            "Peacekeeper",
            "Mechanic",
            "Ragman",
            "Jaeger",
            ...config.customTradersToInclude
        ])

        const lootList = new Set(
            Object.values(loot)
                .map(({ itemDistribution }) => itemDistribution)
                .flat(1).map(({ tpl }) => tpl))
        const filterLootList = [...lootList].filter(id => !checkParentRecursive(id, items, excludableParents))

        const getName = (id: string) => {
            const itemNameId = `${id} Name`
            const itemShortNameId = `${id} ShortName`
            return `${local[itemNameId]} (${local[itemShortNameId]})`
        }

        const handbookMapper = {} as Record<string, number>

        handbook.Items.forEach(({ Id, Price }) => {
            handbookMapper[Id] = Price
        })

        const tradeItemMapper = {}

        Object.keys(traders).forEach((traderId) => {
            const trader = traders[traderId]
            if (!tradersToInclude.has(trader.base.nickname)) return
            trader?.assort?.items.forEach(item => {
                tradeItemMapper[item._id] = item._tpl
            })
        })

        const getPrice = (id: string, reverse = false): number | undefined => {
            let multiplier = 1
            if (!items[id]._props.CanSellOnRagfair) multiplier *= 2
            const handbookVal = handbookMapper[id]
            const fleaVal = prices[id]

            switch (true) {
                case reverse && !!fleaVal && !isNaN(fleaVal)!! && handbookVal && !isNaN(handbookVal):
                    return (handbookVal + fleaVal / 2) * multiplier
                case !!fleaVal && !isNaN(fleaVal):
                    return fleaVal * multiplier
                case !!handbookVal && !isNaN(handbookVal):
                    return handbookVal * multiplier
                default:
                    break;
            }
        }

        const cutLootList = [...filterLootList].sort((a, b) => getPrice(a) - getPrice(b))

        const getAlt = (randomSeed: string, totalCost: number, itemSet: Set<string>) => {
            const filteredLootList = cutLootList.filter((id) => !itemSet.has(id) && !excludedItemsList.has(id))
            let maxKey = filteredLootList.findIndex((id) => getPrice(id) > totalCost)
            if (maxKey < 0) maxKey = filteredLootList.length - 1
            if (maxKey < 20) maxKey = 20
            let minKey = maxKey === (filteredLootList.length - 1) ? maxKey - 50 : maxKey - 20
            if (minKey < 0) minKey = 0

            const newKey = seededRandom(minKey, maxKey, randomSeed)
            const newId = filteredLootList[newKey]

            if (!newId) {
                this.Logger.error(`Unable to find 'newId' random seed ${randomSeed} new key${newKey} ${minKey}${maxKey}`)
                return ""
            }
            return newId
        }

        const getNewBarterList = (randomSeed: string, ongoingCost: number = 0, newBarterList: IBarterScheme[] = [], originalTotalCost: number, isCash: boolean = false, itemSet: Set<string>) => {
            const totalRemaining = originalTotalCost - ongoingCost
            const newId = getAlt(randomSeed, totalRemaining, itemSet)
            if (!newId) return undefined
            itemSet.add(newId)
            const value = getPrice(newId)
            let itemCount = Math.round((totalRemaining / value)) || 1
            if (itemCount > 15) itemCount = 15

            const cost = value * itemCount

            if (config.debug || (isCash && config.debugCashItems)) this.Logger.logWithColor(`${itemCount} x ${getName(newId)} ${itemCount * getPrice(newId)}`, LogTextColor.CYAN)
            newBarterList.push({ _tpl: newId, count: itemCount })

            ongoingCost = Math.round(ongoingCost + cost)

            if ((ongoingCost * 1.3) > originalTotalCost) return newBarterList

            return getNewBarterList(randomSeed + ongoingCost, ongoingCost, newBarterList, originalTotalCost, isCash, itemSet)
        }

        let tradeItemsChanged = 0
        let cashItemsChanged = 0
        let averageDeviation = 0
        let averageCashDeviation = 0
        Object.keys(traders).forEach((traderId) => {
            const trader = traders[traderId]
            const name = trader.base.nickname
            if (!tradersToInclude.has(name)) {
                (config.printUnkownTraders && !knownInternalTraders.has(name)) && this.Logger.logWithColor(`AlgorithmicBarterRandomizer: Unknown trader detected: ${name}`, LogTextColor.MAGENTA)
                return;
            }
            if (config.enableHardcore) {
                //reduceTraderLoyaltySpendRequirement
                if (config.hardcoreSettings.reduceTraderLoyaltySpendRequirement) {
                    trader.base?.loyaltyLevels.forEach((_, index) => {
                        if (trader.base?.loyaltyLevels[index].minSalesSum)
                            trader.base.loyaltyLevels[index].minSalesSum *= 0.15
                    })
                }

                //IncreaseMinBuyCounts
                if (config.hardcoreSettings.increaseMinBuyCounts) {
                    trader?.assort?.items.forEach((_, index) => {
                        const restriction = trader?.assort?.items[index]?.upd?.BuyRestrictionMax
                        if (restriction && restriction < 5) trader.assort.items[index].upd.BuyRestrictionMax = 5
                    })
                }

                //reduceTraderBuyPrice
                if (config.hardcoreSettings.reduceTraderBuyPrice) {
                    trader.base?.loyaltyLevels.forEach((_, index) => {
                        if (trader?.base?.loyaltyLevels?.[index])
                            trader.base.loyaltyLevels[index].buy_price_coef *= 1.5
                    })
                }
            }

            const barters = trader.assort.barter_scheme

            Object.keys(barters).forEach(barterId => {
                const itemId = tradeItemMapper[barterId]
                const barter = barters[barterId]
                if (!barter?.[0]?.[0]?._tpl || !items?.[itemId]?._parent) return
                const offer = this.ragFairServer.getOffer(barterId)
                let value = Math.max(offer?.itemsCost, offer?.summaryCost, getPrice(itemId))
                const originalValue = value
                switch (true) {
                    case moneyType.has(barter[0][0]._tpl): //MoneyValue
                        if (!config.enableHardcore || checkParentRecursive(itemId, items, excludableCashParents)) break;
                        if (isNaN(value) || value < config.hardcoreSettings.cashItemCutoff) break;
                        value *= config.barterCostMultiplier
                        config.debugCashItems && this.Logger.logWithColor(`${getName(itemId)}`, LogTextColor.YELLOW)
                        config.debugCashItems && this.Logger.logWithColor(`${value} ${barter[0][0].count} ${getName(barter[0][0]._tpl)}`, LogTextColor.BLUE)
                        const newCashBarter = getNewBarterList(barterId.replace(/[^a-z0-9-]/g, ''), undefined, undefined, value, true, new Set([itemId]))


                        if (!newCashBarter || !newCashBarter.length) break;
                        let newCashCost = 0
                        config.debugCashItems && newCashBarter.forEach(({ count, _tpl }) => {
                            newCashCost += (count * getPrice(_tpl))
                        })
                        const cashDeviation =
                            Math.round((newCashCost > originalValue ?
                                (newCashCost - originalValue) / originalValue :
                                (originalValue - newCashCost) / originalValue) * 100) * (newCashCost > originalValue ? 1 : -1)
                        config.debugCashItems && this.Logger.logWithColor(
                            `${newCashCost > originalValue ? "MORE THAN" : "LESS THAN"} actual value ${cashDeviation}%\n`,
                            newCashCost > originalValue ? LogTextColor.RED : LogTextColor.GREEN
                        )
                        cashItemsChanged++

                        averageCashDeviation += cashDeviation
                        offer.requirements = newCashBarter.map((barterInfo: { _tpl: string, count: number }) => ({ ...barterInfo, onlyFunctional: false }))
                        barter[0] = newCashBarter
                        break;
                    default:
                        value *= config.barterCostMultiplier
                        config.debug && this.Logger.logWithColor(`${getName(itemId)} - ${value}`, LogTextColor.YELLOW)
                        let totalCost = 0

                        barter[0].forEach(({ count, _tpl }) => {
                            config.debug && this.Logger.logWithColor(`${count} x ${getName(_tpl)} ${getPrice(barter[0][0]._tpl)}`, LogTextColor.MAGENTA)
                            totalCost += (count * getPrice(_tpl))
                        })


                        const newBarters = getNewBarterList((barterId + itemId).replace(/[^a-z0-9-]/g, ''), undefined, undefined, value, false, new Set([itemId]))

                        if (!newBarters || !newBarters.length) break;

                        let newCost = 0
                        config.debug && newBarters.forEach(({ count, _tpl }) => {
                            newCost += (count * getPrice(_tpl))
                        })
                        config.debug && this.Logger.info(`original cost: ${totalCost} > new cost: ${newCost} > itemCost: ${value}`)
                        config.debug && this.Logger.logWithColor(
                            `${newCost > totalCost ? "INCREASED" : "DECREASED"} from original ${newCost > totalCost ? newCost - totalCost : totalCost - newCost}`,
                            newCost > totalCost ? LogTextColor.RED : LogTextColor.GREEN
                        )
                        const deviation = Math.round((newCost > originalValue ? (newCost - originalValue) / originalValue : (originalValue - newCost) / originalValue) * 100) * (newCost > originalValue ? 1 : -1)
                        averageDeviation += deviation
                        config.debug && this.Logger.logWithColor(
                            `${newCost > originalValue ? "MORE THAN" : "LESS THAN"} actual value ${deviation}%`,
                            newCost > originalValue ? LogTextColor.RED : LogTextColor.GREEN
                        )

                        config.debug && console.log("\n")

                        tradeItemsChanged++
                        offer.requirements = newBarters.map((barterInfo: { _tpl: string, count: number }) => ({ ...barterInfo, onlyFunctional: false }))
                        barter[0] = newBarters
                        break;
                }
            })
        })

        const finalCashDeviation = Math.round((averageCashDeviation / cashItemsChanged) * 100) / 100
        config.debugCashItems && this.Logger.logWithColor(`FinalCashDeviation ${finalCashDeviation}%\n`, LogTextColor.YELLOW)

        const finalDeviation = Math.round((averageDeviation / tradeItemsChanged) * 100) / 100
        config.debug && this.Logger.logWithColor(`FinalDeviation ${finalDeviation}%\n`, LogTextColor.YELLOW)

        this.Logger.info(`AlgorithmicBarterRandomizer: Updated ${tradeItemsChanged + cashItemsChanged} item barters`)
    }
}