/*
 * load html pages in different screen widths
 *
 * node index.js <configname>.js
 *
 * (c) Uwe Gerdes, entwicklung@uwegerdes.de
 */
'use strict';

const exec = require('child_process').exec,
  del = require('del'), // jshint ignore:line
  makeDir = require('make-dir'), // jshint ignore:line
  path = require('path'),
  conf = require('./lib/config');

const configDir = './config',
  resultsDir = './results',
  configFile = process.argv[2] || 'default.js',
  config = require(configDir + '/' + configFile), // jshint ignore:line
  destDir = path.join(resultsDir, configFile.replace(/\.js$/, ''));

const timeout = 40000;

const verbose = conf.server.verbose;

// - jshint 2.9.x does not support async/await
/* jshint ignore:start */
(async () => {
  let data = [];
  config.engines.forEach((engine) => {
    config.viewports.forEach((viewport) => {
      data.push({ config: config, engine: engine, viewport: viewport });
    });
  });
  try {
    await makeDir(destDir);
    await del([path.join(destDir, '*.*')]);
    data.forEach(async (entry) => {
      await loadPage(entry);
    });
  } catch (error) {
    console.log('error: ', error);
  }
})();
/* jshint ignore:end */

function loadPage(data) { // jshint ignore:line
  const pageKey = data.engine + '_' + data.viewport.name;
  const dest = path.join(destDir, pageKey);
  const args = ['./lib/load-page.js',
    '--url="' + data.config.url + '"',
    '--selector="' + data.config.selector + '"',
    '--dest="' + dest + '"',
    '--width="' + data.viewport.viewport.width + '"'];
  let cmd = 'casperjs';
  if (data.engine === 'slimerjs') {
    //			cmd = 'xvfb-run -a -e ./xvfb-run.stdout casperjs';
    cmd = 'xvfb-run -a casperjs';
    //			cmd = 'casperjs';
  }
  return new Promise((resolve, reject) => {
    console.log('starting:', data.engine, data.viewport.name, args.join(' '));
    const loader = exec(cmd + ' ' + args.join(' '),
      { timeout: timeout },
      (error) => {
        if (error) {
          reject({
            error: error,
            url: data.config.url,
            selector: data.config.selector,
            engine: data.engine,
            viewport: data.viewport
          });
          return;
        }
        console.log('finished: ' +
          data.config.url + ' ' +
          data.config.selector + ' with ' +
          data.engine + ' ' +
          data.viewport.name
        );
        resolve({
          url: data.config.url,
          selector: data.config.selector,
          engine: data.engine,
          viewport: data.viewport
        });
      }
    );
    loader.stdout.on('data', (data) => {
      if (verbose) {
        console.log(pageKey + ': ' + data.trim());
      }
    });
    loader.stderr.on('data', (data) => {
      console.log(pageKey + ' stderr: ' + data.trim());
    });
    loader.on('error', (err) => {
      console.log(pageKey + ' error: ' + err.trim());
    });
  });
}
