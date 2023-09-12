import { ILogger } from './../../types/models/spt/utils/ILogger.d';
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { DependencyContainer } from "tsyringe";
import config from "../../config/config.json"
import { ammoParent, difficulties, excludableCashParents, excludableParents, excludedItemsList, knownInternalTraders, magParent, moneyType } from "./BarterChangerUtils";
import { checkParentRecursive, seededRandom } from "../utils";
import { IBarterScheme } from '@spt-aki/models/eft/common/tables/ITrader';
import { RagfairServer } from "@spt-aki/servers/RagfairServer";
import { LogTextColor } from "@spt-aki/models/spt/logging/LogTextColor";


const fs = require("fs");

export default function BarterChanger(
    container: DependencyContainer
): undefined {
    const tables = container.resolve<DatabaseServer>("DatabaseServer").getTables();
    const items = tables.templates.items;
    const flee = tables.globals.config.RagFair;
    const ragFairServer = container.resolve<RagfairServer>("RagfairServer");
    const prices = tables.templates.prices
    const logger = container.resolve<ILogger>("WinstonLogger")
    const traders = tables.traders

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

    const loot = tables.loot.staticLoot
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

    const locales = tables.locales
    const local = locales.global.en

    const handbook = tables.templates.handbook

    const handbookMapper = {} as Record<string, number>

    handbook.Items.forEach(({ Id, Price }) => {
        handbookMapper[Id] = Price
    })

    const getPrice = (id: string, reverse = false): number | undefined => {
        let multiplier = 1
        if (!items[id]._props.CanSellOnRagfair) multiplier *= 2
        // if (checkParentRecursive(id, items, ["5422acb9af1c889c16000029", "543be5cb4bdc2deb348b4568"])) {
        //     reverse = false
        // }
        const handbookVal = handbookMapper[id]
        const fleaVal = prices[id]

        switch (true) {
            // case handbookVal && fleaVal && !isNaN(fleaVal) && !isNaN(handbookVal):
            //     return (handbookVal + fleaVal) / 2
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

    const getAlt = (randomSeed: string, totalCost: number, itemId: string) => {
        const filteredLootList = cutLootList.filter((id) => itemId !== id && !excludedItemsList.has(id))
        let maxKey = filteredLootList.findIndex((id) => getPrice(id) > totalCost)
        if (maxKey < 0) maxKey = filteredLootList.length - 1
        let minKey = maxKey === (filteredLootList.length - 1) ? maxKey - 30 : maxKey - 10
        if (minKey < 0) minKey = 0

        const newKey = seededRandom(minKey, maxKey, randomSeed)
        const newId = filteredLootList[newKey]

        if (!newId) {
            logger.error(`Unable to find 'newId' random seed ${randomSeed} new key${newKey} ${minKey}${maxKey}`)
            return ""
        }
        return newId
    }

    const getNewBarterList = (randomSeed: string, ongoingCost: number = 0, newBarterList: IBarterScheme[] = [], originalTotalCost: number, isCash: boolean = false, itemId: string) => {
        const totalRemaining = originalTotalCost - ongoingCost
        const newId = getAlt(randomSeed, totalRemaining, itemId)
        if (!newId) return undefined
        const multipliedValue = getPrice(newId)
        let itemCount = Math.round(totalRemaining / multipliedValue) || 1
        if (itemCount > 15) itemCount = 15
        if (!newBarterList.length && itemCount > 5 && itemCount < 15) {
            itemCount = 5
        }
        const cost = multipliedValue * itemCount

        if (config.debug || (isCash && config.debugCashItems)) logger.logWithColor(`${itemCount} x ${getName(newId)} ${itemCount * getPrice(newId)}`, LogTextColor.CYAN)
        newBarterList.push({ _tpl: newId, count: itemCount })

        ongoingCost = Math.round(ongoingCost + cost)

        if ((ongoingCost * 1.3) > originalTotalCost) return newBarterList

        return getNewBarterList(randomSeed + ongoingCost, ongoingCost, newBarterList, originalTotalCost, isCash, itemId)
    }

    let tradeItemsChanged = 0
    let cashItemsChanged = 0
    let averageDeviation = 0
    let averageCashDeviation = 0
    Object.keys(traders).forEach((traderId) => {
        const trader = traders[traderId]
        const name = trader.base.nickname
        if (!tradersToInclude.has(name)) {
            (config.printUnkownTraders && !knownInternalTraders.has(name)) && logger.logWithColor(`AlgorithmicBarterRandomizer: Unknown trader detected: ${name}`, LogTextColor.MAGENTA)
            return;
        }
        if (config.enableHardcore) {
            //reduceTraderLoyaltySpendRequirement
            if (config.hardcoreSettings.reduceTraderLoyaltySpendRequirement) {
                trader.base?.loyaltyLevels.forEach((_, index) => {
                    if (trader.base?.loyaltyLevels[index].minSalesSum)
                        trader.base.loyaltyLevels[index].minSalesSum *= 0.2
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
        const tradeItemMapper = {}
        trader.assort.items.forEach(item => {
            tradeItemMapper[item._id] = item._tpl
        })

        Object.keys(barters).forEach(barterId => {
            const itemId = tradeItemMapper[barterId]
            const barter = barters[barterId]
            if (!barter?.[0]?.[0]?._tpl) return
            const offer = ragFairServer.getOffer(barterId)
            let value = offer.summaryCost
            switch (true) {
                case moneyType.has(barter[0][0]._tpl): //MoneyValue
                    if (!config.enableHardcore || checkParentRecursive(itemId, items, excludableCashParents)) break;
                    if (value < config.hardcoreSettings.cashItemCutoff) return;
                    value *= difficulties[config.difficulty].cash
                    config.debugCashItems && logger.logWithColor(`${getName(itemId)}`, LogTextColor.YELLOW)
                    config.debugCashItems && logger.logWithColor(`${value} ${barter[0][0].count} ${getName(barter[0][0]._tpl)}`, LogTextColor.BLUE)
                    const newCashBarter = getNewBarterList(barterId.replace(/[^a-z0-9-]/g, ''), undefined, undefined, value, true, itemId)
                    let newCashCost = 0
                    config.debugCashItems && newCashBarter.forEach(({ count, _tpl }) => {
                        newCashCost += (count * getPrice(_tpl))
                    })

                    if (!newCashBarter || !newCashBarter.length) break;
                    const cashDeviation =
                        Math.round((newCashCost > offer.summaryCost ?
                            (newCashCost - offer.summaryCost) / offer.summaryCost :
                            (offer.summaryCost - newCashCost) / offer.summaryCost) * 100) * (newCashCost > offer.summaryCost ? 1 : -1)
                    config.debugCashItems && logger.logWithColor(
                        `${newCashCost > offer.summaryCost ? "MORE THAN" : "LESS THAN"} actual value ${cashDeviation}%\n`,
                        newCashCost > offer.summaryCost ? LogTextColor.RED : LogTextColor.GREEN
                    )
                    cashItemsChanged++

                    averageCashDeviation += cashDeviation
                    offer.requirements = newCashBarter.map((barterInfo: { _tpl: string, count: number }) => ({ ...barterInfo, onlyFunctional: false }))
                    barter[0] = newCashBarter
                    break;
                default:
                    value *= difficulties[config.difficulty].barter
                    config.debug && logger.logWithColor(`${getName(itemId)} - ${value}`, LogTextColor.YELLOW)
                    let totalCost = 0

                    barter[0].forEach(({ count, _tpl }) => {
                        if (excludedItemsList.has(_tpl)) return
                        config.debug && logger.logWithColor(`${count} x ${getName(_tpl)} ${getPrice(barter[0][0]._tpl)}`, LogTextColor.MAGENTA)
                        totalCost += (count * getPrice(_tpl))
                    })

                    // if (isNaN(value)) {
                    //     config.debug && logger.info(`No price info attempting override`)
                    //     if (!isNaN(totalCost)) value = totalCost
                    //     else return config.debug && logger.info(`Unable to Override!!!! Skipping`)
                    // }

                    const newBarters = getNewBarterList((barterId + itemId).replace(/[^a-z0-9-]/g, ''), undefined, undefined, value, false, itemId)

                    if (!newBarters || !newBarters.length) break;

                    let newCost = 0
                    config.debug && newBarters.forEach(({ count, _tpl }) => {
                        newCost += (count * getPrice(_tpl))
                    })
                    config.debug && logger.info(`original cost: ${totalCost} > new cost: ${newCost} > itemCost: ${value}`)
                    config.debug && logger.logWithColor(
                        `${newCost > totalCost ? "INCREASED" : "DECREASED"} from original ${newCost > totalCost ? newCost - totalCost : totalCost - newCost}`,
                        newCost > totalCost ? LogTextColor.RED : LogTextColor.GREEN
                    )
                    const deviation = Math.round((newCost > offer.summaryCost ? (newCost - offer.summaryCost) / offer.summaryCost : (offer.summaryCost - newCost) / offer.summaryCost) * 100) * (newCost > offer.summaryCost ? 1 : -1)
                    averageDeviation += deviation
                    config.debug && logger.logWithColor(
                        `${newCost > offer.summaryCost ? "MORE THAN" : "LESS THAN"} actual value ${deviation}%`,
                        newCost > offer.summaryCost ? LogTextColor.RED : LogTextColor.GREEN
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
    config.debugCashItems && logger.logWithColor(`FinalCashDeviation ${finalCashDeviation}%\n`, LogTextColor.YELLOW)

    const finalDeviation = Math.round((averageDeviation / tradeItemsChanged) * 100) / 100
    config.debug && logger.logWithColor(`FinalDeviation ${finalDeviation}%\n`, LogTextColor.YELLOW)

    logger.info(`AlgorithmicBarterRandomizer: Changed ${tradeItemsChanged} trade items and ${cashItemsChanged} cash items`)
}

