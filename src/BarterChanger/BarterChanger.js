"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalValueSetup = exports.BarterChanger = void 0;
const GlobalValues_1 = require("./GlobalValues");
const BarterChanger = (container) => {
    const staticRouterModService = container.resolve("StaticRouterModService");
    const traderController = container.resolve("TraderController");
    GlobalValues_1.globalValues.traderController = traderController;
    container.afterResolution("TraderController", (_t, result) => {
        result.getAssort = (sessionId, traderId) => {
            const result = traderController.getAssort(sessionId, traderId);
            GlobalValues_1.globalValues.updateBarters(result.nextResupply);
            return result;
        };
    }, { frequency: "Always" });
    staticRouterModService.registerStaticRouter(`AlgorithmicBarterChangerUpdater`, [{
            url: "/client/trading/api/traderSettings",
            action: (_url, info, sessionId, output) => {
                GlobalValues_1.globalValues.updateBarters();
                return output;
            }
        }], "aki");
    GlobalValues_1.globalValues.config.debug && console.log("Algorthimic LevelProgression: Custom router AlgorithmicLevelProgressionMapUpdater Registered");
};
exports.BarterChanger = BarterChanger;
const GlobalValueSetup = (container) => {
    GlobalValues_1.globalValues.tables = container.resolve("DatabaseServer").getTables();
    GlobalValues_1.globalValues.Logger = container.resolve("WinstonLogger");
    GlobalValues_1.globalValues.RagfairOfferService = container.resolve("RagfairOfferService");
};
exports.GlobalValueSetup = GlobalValueSetup;
