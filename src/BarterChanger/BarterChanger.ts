import { ILogger } from './../../types/models/spt/utils/ILogger.d';
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { DependencyContainer } from "tsyringe";
import config from "../../config/config.json"
import { ammoParent, difficulties, excludableCashParents, excludableParents, excludedItemsList, magParent, moneyType } from "./BarterChangerUtils";
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
        if (reverse && handbookMapper[id] && !isNaN(handbookMapper[id])) return handbookMapper[id]
        if (prices[id] && !isNaN(prices[id])) return prices[id]
        if (handbookMapper[id] && !isNaN(handbookMapper[id])) return handbookMapper[id]
    }

    const cutLootList = [...filterLootList].sort((a, b) => getPrice(a) - getPrice(b))

    const getAlt = (randomSeed: string, totalCost: number, isCash = false) => {
        let maxKey = -1 + cutLootList.findIndex((id) => getPrice(id) > totalCost)
        if (maxKey >= 0 && maxKey < 5) maxKey = 10
        if (maxKey < 0) maxKey = cutLootList.length - 1
        if (!cutLootList[maxKey]) {
            logger.error(`Unable to find 'cutLootList[maxKey]' `)
            return ""
        }
        let minKey = Math.round(maxKey * (isCash ? 0.7 : (maxKey > 200 ? 0.9 : 0.4)))
        const newKey = seededRandom(minKey, maxKey, randomSeed)
        const newId = cutLootList[newKey]
        // console.log(minKey, maxKey, totalCost, prices[newId], getName(newId))
        if (!newId) {
            logger.error(`Unable to find 'newId' random seed ${randomSeed} new key${newKey} ${minKey}${maxKey}`)
            return ""
        }
        return newId
    }

    const getNewBarterList = (randomSeed: string, ongoingCost: number = 0, newBarterList: IBarterScheme[] = [], originalTotalCost: number, isCash: boolean = false) => {
        const { ongoing, multiplier } = difficulties[config.difficulty]
        const totalRemaining = originalTotalCost - ongoingCost
        const newId = getAlt(randomSeed, totalRemaining, isCash)
        if (!newId) return undefined
        const multipliedValue = multiplier * getPrice(newId)
        let itemCount = Math.round(totalRemaining / multipliedValue) || 1
        if (itemCount > 15) itemCount = 15
        if (!newBarterList.length && itemCount > 5 && itemCount < 15) {
            itemCount = 5
        }
        const cost = multipliedValue * itemCount
        //getName(newId) + cost
        if (config.debug || (isCash && config.debugCashItems)) logger.logWithColor(`${itemCount} x ${getName(newId)} ${itemCount * getPrice(newId)}`, LogTextColor.GREEN)
        newBarterList.push({ _tpl: newId, count: itemCount })

        ongoingCost = Math.round(ongoingCost + cost)

        if ((ongoingCost * ongoing) > originalTotalCost) return newBarterList

        return getNewBarterList(randomSeed + ongoingCost, ongoingCost, newBarterList, originalTotalCost, isCash)
    }

    let tradeItemsChanged = 0
    let cashItemsChanged = 0

    Object.keys(traders).forEach((traderId) => {
        const trader = traders[traderId]
        const name = trader.base.nickname
        if (!tradersToInclude.has(name)) return

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
            let value = getPrice(itemId)
            switch (true) {
                case moneyType.has(barter[0][0]._tpl): //MoneyValue
                    if (!config.enableHardcore || checkParentRecursive(itemId, items, excludableCashParents)) break;

                    if (isNaN(value)) value = barter[0][0].count
                    if (isNaN(value)) break;
                    if (getPrice(itemId, true) < config.hardcoreSettings.cashItemCutoff) return;
                    config.debugCashItems && logger.logWithColor(`${getName(itemId)}`, LogTextColor.YELLOW)
                    config.debugCashItems && logger.logWithColor(`${value} ${barter[0][0].count} ${getName(barter[0][0]._tpl)}`, LogTextColor.BLUE)
                    const newCashBarter = getNewBarterList(barterId.replace(/[^a-z0-9-]/g, ''), undefined, undefined, value, true)
                    config.debugCashItems && console.log("\n")

                    if (!newCashBarter || !newCashBarter.length) break;
                    cashItemsChanged++

                    offer.requirements = newCashBarter.map((barterInfo: { _tpl: string, count: number }) => ({ ...barterInfo, onlyFunctional: false }))
                    barter[0] = newCashBarter
                    break;
                default:
                    config.debug && logger.logWithColor(`${getName(itemId)}`, LogTextColor.YELLOW)
                    let totalCost = 0

                    barter[0].forEach(({ count, _tpl }) => {
                        if (excludedItemsList.has(_tpl)) return
                        config.debug && logger.logWithColor(`${count} x ${getName(_tpl)}`, LogTextColor.BLUE)
                        totalCost += (count * getPrice(_tpl))
                    })

                    config.debug && logger.info(`========================= original cost ${totalCost} Actual cost > ${value}`)

                    if (isNaN(value)) {
                        config.debug && logger.info(`No price info attempting override`)
                        if (!isNaN(totalCost)) value = totalCost
                        else return config.debug && logger.info(`Unable to Override!!!! Skipping`)
                    }

                    const newBarters = getNewBarterList(barterId.replace(/[^a-z0-9-]/g, ''), undefined, undefined, value)

                    config.debug && console.log("\n")

                    if (!newBarters || !newBarters.length) break;
                    tradeItemsChanged++
                    offer.requirements = newBarters.map((barterInfo: { _tpl: string, count: number }) => ({ ...barterInfo, onlyFunctional: false }))
                    barter[0] = newBarters
                    break;
            }
        })
    })

    logger.info(`AlgorithmicBarterRandomizer: Changed ${tradeItemsChanged} trade items and ${cashItemsChanged} cash items`)
}

