import { IPreAkiLoadMod } from './../../AlgorithmicQuestRandomizer/types/models/external/IPreAkiLoadMod.d';
/* eslint-disable @typescript-eslint/naming-convention */
import { DependencyContainer } from "tsyringe";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { enable } from "../config/config.json"
import { BarterChanger, GlobalValueSetup } from './BarterChanger/BarterChanger';

class AlgorithmicBarterRandomizer implements IPreAkiLoadMod, IPostAkiLoadMod {
    postAkiLoad(container: DependencyContainer): void {
        enable && GlobalValueSetup(container)
    }
    preAkiLoad(container: DependencyContainer): void {
        enable && BarterChanger(container)
    }
}

module.exports = { mod: new AlgorithmicBarterRandomizer() }