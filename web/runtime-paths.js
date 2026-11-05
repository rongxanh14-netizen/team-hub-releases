'use strict';
const path = require('node:path');
// Desktop data must live outside the installed/read-only application archive.
const dataDir = path.resolve(process.env.TEAM_HUB_DATA_DIR || path.join(__dirname, 'data'));
module.exports = {dataDir};
