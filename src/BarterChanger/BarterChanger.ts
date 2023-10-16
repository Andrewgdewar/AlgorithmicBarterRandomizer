import { StaticRouterModService } from '@spt-aki/services/mod/staticRouter/StaticRouterModService';
import { ILogger } from './../../types/models/spt/utils/ILogger.d';
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { DependencyContainer } from "tsyringe";
import { globalValues } from './GlobalValues';
import { RagfairOfferService } from '@spt-aki/services/RagfairOfferService';


export const BarterChanger = (
    container: DependencyContainer
): undefined => {
    const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

    staticRouterModService.registerStaticRouter(`AlgorithmicBarterChangerUpdater`, [{
        url: "/client/trading/api/traderSettings",
        action: (_url, info, _sessionId, output) => {
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

