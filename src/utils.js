"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkParentRecursive = exports.seededRandom = exports.saveToFile = exports.stringToNum = exports.moneyParent = exports.keyParent = void 0;
const config_json_1 = __importDefault(require("../config/config.json"));
exports.keyParent = "543be5e94bdc2df1348b4568";
exports.moneyParent = "543be5dd4bdc2deb348b4569";
const chars = " abcdefghijklmnopqrstuvwxyz1234567890".split("");
const stringToNum = (str) => {
    if (!str)
        return 0;
    const loweredStr = str.toLowerCase();
    let result = 0;
    for (let index = 0; index < loweredStr.length; index++) {
        const letter = loweredStr[index];
        const num = chars.indexOf(letter);
        if (num === -1)
            return;
        result = (num) + result;
    }
    // console.log(loweredStr, result)
    return result;
};
exports.stringToNum = stringToNum;
const saveToFile = (data, filePath) => {
    var fs = require('fs');
    let dir = __dirname;
    let dirArray = dir.split("\\");
    const directory = (`${dirArray[dirArray.length - 4]}/${dirArray[dirArray.length - 3]}/${dirArray[dirArray.length - 2]}/`);
    fs.writeFile(directory + filePath, JSON.stringify(data, null, 4), function (err) {
        if (err)
            throw err;
    });
};
exports.saveToFile = saveToFile;
// in order to work 'Math.seed' must NOT be undefined,
// so in any case, you HAVE to provide a Math.seed
const seededRandom = (max, min, target) => {
    const targetSeed = (0, exports.stringToNum)(target);
    max = max || 1;
    min = min || 0;
    let seed = config_json_1.default.seed + targetSeed;
    seed = (seed * 9301 + 49297) % 233280;
    var rnd = seed / 233280;
    return Math.round(min + rnd * (max - min));
};
exports.seededRandom = seededRandom;
const checkParentRecursive = (parentId, items, queryIds) => {
    if (queryIds.includes(parentId))
        return true;
    if (!items?.[parentId]?._parent)
        return false;
    return (0, exports.checkParentRecursive)(items[parentId]._parent, items, queryIds);
};
exports.checkParentRecursive = checkParentRecursive;
