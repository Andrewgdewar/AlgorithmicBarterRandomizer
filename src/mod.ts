import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { DependencyContainer } from "tsyringe";
import { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
import { enable } from "../config/config.json";
import { BarterChanger, GlobalValueSetup } from "./BarterChanger/BarterChanger";
import { globalValues } from "./BarterChanger/GlobalValues";

class AlgorithmicBarterRandomizer implements IPreSptLoadMod, IPostSptLoadMod {
  preSptLoad(container: DependencyContainer): void {
    enable && BarterChanger(container);
  }
  postSptLoad(container: DependencyContainer): void {
    if (enable) {
      GlobalValueSetup(container);
      globalValues.updateBarters();
    }
  }
}

module.exports = { mod: new AlgorithmicBarterRandomizer() };
