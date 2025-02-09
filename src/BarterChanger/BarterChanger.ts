import { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import { ILogger } from "./../../types/models/spt/utils/ILogger.d";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { DependencyContainer } from "tsyringe";
import { globalValues } from "./GlobalValues";
import { RagfairOfferService } from "@spt/services/RagfairOfferService";
import { TraderController } from "@spt/controllers/TraderController";
import { RagfairPriceService } from "@spt/services/RagfairPriceService";
import { RagfairRequiredItemsService } from "@spt/services/RagfairRequiredItemsService";
import { TraderAssortService } from "@spt/services/TraderAssortService";

export const BarterChanger = (container: DependencyContainer): undefined => {
  const staticRouterModService = container.resolve<StaticRouterModService>(
    "StaticRouterModService"
  );

  const traderController =
    container.resolve<TraderController>("TraderController");
  globalValues.traderController = traderController;

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

  globalValues.config.debug &&
    console.log("AlgorthimicBarterChanger: Custom router Registered");
};

export const GlobalValueSetup = (container: DependencyContainer) => {
  globalValues.tables = container
    .resolve<DatabaseServer>("DatabaseServer")
    .getTables();
  globalValues.Logger = container.resolve<ILogger>("WinstonLogger");
  globalValues.RagfairOfferService = container.resolve<RagfairOfferService>(
    "RagfairOfferService"
  );
  globalValues.RagfairRequiredItemsService =
    container.resolve<RagfairRequiredItemsService>(
      "RagfairRequiredItemsService"
    );

  globalValues.TraderAssortService = container.resolve<TraderAssortService>(
    "TraderAssortService"
  );
  globalValues.RagfairPriceService = container.resolve<RagfairPriceService>(
    "RagfairPriceService"
  );
};
