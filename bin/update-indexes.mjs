/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

import path from "path";
import { updateIndexes } from "../build/updateIndexes.js";
import { fileURLToPath } from 'url';

/**
 * Update index.json files in the css, i18n, editions and dictionaries
 * directories. These files are required on simple http servers that
 * don't support server-side scripting (i.e. when the Xanado code is running
 * "standalone"
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
updateIndexes(path.normalize(path.join(__dirname, "..")));

