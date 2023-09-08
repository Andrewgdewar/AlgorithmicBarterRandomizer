import { ITemplateItem } from "@spt-aki/models/eft/common/tables/ITemplateItem"
import config from "../config/config.json";

const chars = " abcdefghijklmnopqrstuvwxyz1234567890".split("")

export const stringToNum = (str: string) => {
    if (!str) return 0
    const loweredStr = str.toLowerCase()
    let result = 0
    for (let index = 0; index < loweredStr.length; index++) {
        const letter = loweredStr[index];
        const num = chars.indexOf(letter)
        if (num === -1) return
        result = (num) + result
    }
    // console.log(loweredStr, result)
    return result
}

export const saveToFile = (data, filePath) => {
    var fs = require('fs');
    let dir = __dirname;
    let dirArray = dir.split("\\");
    const directory = (`${dirArray[dirArray.length - 4]}/${dirArray[dirArray.length - 3]}/${dirArray[dirArray.length - 2]}/`);
    fs.writeFile(directory + filePath, JSON.stringify(data, null, 4), function (err) {
        if (err) throw err;
    });
}

export const seededRandom = (min: number, max: number, target?: string) => {
    const targetSeed = stringToNum(target)
    let seed = config.seed + targetSeed
    seed = (seed * 9301 + 49297) % 233280;
    var rnd = seed / 233280;

    return Math.round(min + rnd * (max - min));
}


export const checkParentRecursive = (parentId: string, items: Record<string, ITemplateItem>, queryIds: string[]): boolean => {
    if (queryIds.includes(parentId)) return true
    if (!items?.[parentId]?._parent) return false

    return checkParentRecursive(items[parentId]._parent, items, queryIds)
}


