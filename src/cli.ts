import { statusForFiles } from "./status.js";
import { parseFlags, decideExit } from "./strict.js";
import { findLedgers } from "./discover.js";

const flags = parseFlags(process.argv.slice(2));
const ledgers = await findLedgers();
const summary = await statusForFiles(ledgers);
console.log(JSON.stringify(summary, null, 2));
process.exitCode = decideExit(summary, flags);
