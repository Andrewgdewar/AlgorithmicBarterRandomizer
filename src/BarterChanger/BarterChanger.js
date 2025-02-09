"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalValueSetup = exports.BarterChanger = void 0;
const GlobalValues_1 = require("./GlobalValues");
const BarterChanger = (container) => {
    const staticRouterModService = container.resolve("StaticRouterModService");
    const traderController = container.resolve("TraderController");
    GlobalValues_1.globalValues.traderController = traderController;
    // container.afterResolution(
    //   "TraderController",
    //   (_t, result: TraderController) => {
    //     result.getAssort = (sessionId: string, traderId: string) => {
    //       const result = traderController.getAssort(sessionId, traderId);
    //       globalValues.updateBarters(result.nextResupply);
    //       return result;
    //     };
    //   },
    //   { frequency: "Always" }
    // );
    // staticRouterModService.registerStaticRouter(
    //   `AlgorithmicBarterChangerUpdater`,
    //   [
    //     {
    //       url: "/client/trading/api/traderSettings",
    //       action: async (_url, info, sessionId, output) => {
    //         globalValues.updateBarters();
    //         return output;
    //       },
    //     },
    //   ],
    //   "AlgorithmicBarterChangerUpdater"
    // );
    GlobalValues_1.globalValues.config.debug &&
        console.log("AlgorthimicBarterChanger: Custom router Registered");
};
exports.BarterChanger = BarterChanger;
const GlobalValueSetup = (container) => {
    GlobalValues_1.globalValues.tables = container
        .resolve("DatabaseServer")
        .getTables();
    GlobalValues_1.globalValues.Logger = container.resolve("WinstonLogger");
    GlobalValues_1.globalValues.RagfairOfferService = container.resolve("RagfairOfferService");
    GlobalValues_1.globalValues.RagfairRequiredItemsService =
        container.resolve("RagfairRequiredItemsService");
    GlobalValues_1.globalValues.TraderAssortService = container.resolve("TraderAssortService");
    GlobalValues_1.globalValues.RagfairPriceService = container.resolve("RagfairPriceService");
};
exports.GlobalValueSetup = GlobalValueSetup;
//# sourceMappingURL=BarterChanger.js.map