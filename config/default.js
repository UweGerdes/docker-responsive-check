/*
 * default configuration for responsive-check
 */

const slimerjs = 'slimerjs';
const phantomjs = 'phantomjs';

const server = 'localhost:8080';
const baseUrl = 'http://' + server + '/index.html';
const selector = '.console';
const destDir = 'default';
const engines = [phantomjs, slimerjs];
const viewports = [
  {
    'name': 'smartphone-portrait',
    'viewport': { width: 320, height: 480 }
  },
  {
    'name': 'desktop-standard',
    'viewport': { width: 1280, height: 1024 }
  }
];
/*
 * TODO:
const resultStyles = 'body{background-color:#666666}';
const hover = "#submit";
const whitelist = 'www.uwegerdes.de'; // allow load from uri with this substring
const blacklist = '.js'; // do not load - even if it comes from whitelist
const credentials = [ 'username', 'pass' + 'word' ];
 */

module.exports = {
  destDir: destDir,
  url: baseUrl,
  selector: selector,
  viewports: viewports,
  engines: engines
};
