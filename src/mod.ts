/* eslint-disable @typescript-eslint/naming-convention */
import { DependencyContainer } from "tsyringe";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { enable } from "../config/config.json"
import BarterChanger from "./BarterChanger/BarterChanger";

class AlgorithmicBarterRandomizer implements IPostAkiLoadMod {
    postAkiLoad(container: DependencyContainer): void {
        enable && BarterChanger(container)
    }
}

module.exports = { mod: new AlgorithmicBarterRandomizer() }