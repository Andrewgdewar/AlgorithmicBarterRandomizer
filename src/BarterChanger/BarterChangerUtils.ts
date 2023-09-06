import localesConfig from "../../config/locales.json";
import config from "../../config/config.json";
import { ILocaleBase } from "@spt-aki/models/spt/server/ILocaleBase";
import { AvailableForProps } from "@spt-aki/models/eft/common/tables/IQuest";




// export const difficulties = {
//     "easy": { high: 100000, low: 0.8 },
//     "medium": { high: 10, low: 5 },
//     "hard": { high: 5, low: 10 },
//     "masochist": { high: 2, low: 1000000 },
//     "random": { high: 1000000000, low: 1000000000 },
// }

// export const replaceTextForQuest = (locales: ILocaleBase, refId: string, target: string, alternate: string, questId: string, props: AvailableForProps) => {
//     const { minDurability, maxDurability } = props
//     const newId = refId + config.seed

//     const enlocal = locales.global.en
//     const itemNameId = `${target} Name`
//     const itemDescriptionId = `${questId} description`
//     const itemShortNameId = `${target} ShortName`
//     const alternateNameId = `${alternate} Name`
//     const alternateShortNameId = `${alternate} ShortName`
//     const itemEnName = enlocal[itemNameId]
//     const itemEnShortName = enlocal[itemShortNameId]
//     const alternateEnName = enlocal[alternateNameId]
//     const alternateEnShortName = enlocal[alternateShortNameId]

//     const localValue = locales.global.en[refId]
//     let type: "" | "handover" | "obtain" | "armor" | "find" = ""
//     switch (true) {
//         case localValue.includes("Hand over"):
//             type = "handover"
//             break;
//         case localValue.includes("Find"):
//             type = "find"
//             break;
//         case localValue.includes("% durability"):
//             type = "armor"
//             break;
//         case localValue.includes("Obtain"):
//             type = "obtain"
//             break;
//         default:
//             console.warn("AlgorithmicBarterRandomizer:", locales.global.en[refId], "NOT Replaced:", localValue, itemEnShortName, itemEnName, alternateEnName, alternateEnShortName)
//             break;
//     }

//     Object.keys(locales.global).forEach(language => {
//         const local = locales.global[language]
//         const alternateName = local[alternateNameId]
//         const alternateShortName = local[alternateShortNameId]
//         const questDescription = local[itemDescriptionId]
//         const itemNameMulti = local[itemNameId]
//         const itemShortNameMulti = local[itemShortNameId]

//         if (!questDescription || !local[refId] || !local[itemNameId] || !local[itemShortNameId] || !local[alternateNameId] || !local[alternateShortNameId]) {
//             console.warn("AlgorithmicBarterRandomizer:", local[refId], "NOT Replaced for language:", locales.languages[language], "missing value: ", local[refId], local[itemNameId], local[itemShortNameId], local[alternateNameId], local[alternateShortNameId])
//             return ""
//         }

//         if (questDescription?.includes(itemNameMulti) || questDescription.includes(itemShortNameMulti)) {
//             local[itemDescriptionId] = questDescription.replaceAll(itemNameMulti, alternateName).replaceAll(itemShortNameMulti, alternateShortName)
//         }

//         const final = localesConfig?.[language]?.[type] || localesConfig?.["en"]?.[type]

//         if (!type || !final) {
//             console.log("AlgorithmicBarterRandomizer: There's likely an issue with the locales file.")
//             return ""
//         }

//         const newValue = final.replace("<alternateName>", alternateName)
//             .replace("<alternateShortName>", alternateShortName)
//             .replace("<minDurability>", minDurability)
//             .replace("<maxDurability>", maxDurability)

//         local[newId] = newValue
//     })

//     return newId
// }