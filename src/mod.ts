import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
/* eslint-disable @typescript-eslint/naming-convention */
import { DependencyContainer } from "tsyringe";
import { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
import { enable } from "../config/config.json";
import { BarterChanger, GlobalValueSetup } from "./BarterChanger/BarterChanger";

class AlgorithmicBarterRandomizer implements IPreSptLoadMod, IPostSptLoadMod {
  postSptLoad(container: DependencyContainer): void {
    enable && GlobalValueSetup(container);
  }
  preSptLoad(container: DependencyContainer): void {
    enable && BarterChanger(container);
  }
}

module.exports = { mod: new AlgorithmicBarterRandomizer() };
