
import { StaticRouterModService } from '@spt-aki/services/mod/staticRouter/StaticRouterModService';
import { ILogger } from './../../types/models/spt/utils/ILogger.d';
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { DependencyContainer } from "tsyringe";
import { globalValues } from './GlobalValues';
import { RagfairOfferService } from '@spt-aki/services/RagfairOfferService';
import { TraderController } from '@spt-aki/controllers/TraderController';

export const BarterChanger = (
    container: DependencyContainer
): undefined => {
    const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");
    const traderController = container.resolve<TraderController>("TraderController");
    globalValues.traderController = traderController

    container.afterResolution(
        "TraderController",
        (_t, result: TraderController) => {
            result.getAssort = (sessionId: string, traderId: string) => {
                const result = traderController.getAssort(sessionId, traderId)
                globalValues.updateBarters(result.nextResupply)
                return result
            }
        },
        { frequency: "Always" }
    );

    staticRouterModService.registerStaticRouter(`AlgorithmicBarterChangerUpdater`, [{
        url: "/client/trading/api/traderSettings",
        action: (_url, info, sessionId, output) => {
            globalValues.updateBarters()
            return output
        }
    }], "aki");

    globalValues.config.debug && console.log("Algorthimic LevelProgression: Custom router AlgorithmicLevelProgressionMapUpdater Registered")
}


export const GlobalValueSetup = (
    container: DependencyContainer
) => {
    globalValues.tables = container.resolve<DatabaseServer>("DatabaseServer").getTables();
    globalValues.Logger = container.resolve<ILogger>("WinstonLogger")
    globalValues.RagfairOfferService = container.resolve<RagfairOfferService>("RagfairOfferService");
}

