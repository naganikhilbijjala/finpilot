import { SP400 } from "./sp400";
import { SP500, type Constituent } from "./sp500";

/** Built-in stocks: S&P 500 plus S&P 400 mid-caps. */
export const PRESET_UNIVERSE: Constituent[] = [...SP500, ...SP400];

/** Presets plus stocks added by hand never exceed this. */
export const MAX_UNIVERSE = 1000;
export const MAX_CUSTOM = MAX_UNIVERSE - PRESET_UNIVERSE.length;
