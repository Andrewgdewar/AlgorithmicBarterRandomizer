"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkParentRecursive = exports.seededRandom = exports.saveToFile = exports.stringToNum = void 0;
const config_json_1 = __importDefault(require("../config/config.json"));
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
        result = num + result;
    }
    // console.log(loweredStr, result)
    return result;
};
exports.stringToNum = stringToNum;
const saveToFile = (data, filePath) => {
    var fs = require("fs");
    let dir = __dirname;
    let dirArray = dir.split("\\");
    const directory = `${dirArray[dirArray.length - 4]}/${dirArray[dirArray.length - 3]}/${dirArray[dirArray.length - 2]}/`;
    fs.writeFile(directory + filePath, JSON.stringify(data, null, 4), function (err) {
        if (err)
            throw err;
    });
};
exports.saveToFile = saveToFile;
const seededRandom = (min, max, target) => {
    const targetSeed = (0, exports.stringToNum)(target);
    const finalSeed = config_json_1.default.seed || Math.random() * 1000;
    let seed = finalSeed + targetSeed;
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
//# sourceMappingURL=utils.js.map