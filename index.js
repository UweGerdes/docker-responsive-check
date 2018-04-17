/*
 * load html pages in different screen widths
 *
 * node index.js <configname>.js
 *
 * (c) Uwe Gerdes, entwicklung@uwegerdes.de
 */
'use strict';

const exec = require('child_process').exec,
  del = require('del'),
  makeDir = require('make-dir'),
  path = require('path');

const configDir = './config',
  resultsDir = './results',
  configFile = process.argv[2] || 'default.js',
  config = require(configDir + '/' + configFile),
  destDir = path.join(resultsDir, config.destDir);

const timeout = 40000;

makeDir(destDir)
  .then(del([path.join(destDir, '*.*')]))
  .then(() => {
    let data = [];
    config.engines.forEach((engine) => {
      config.viewports.forEach((viewport) => {
        data.push({ config: config, engine: engine, viewport: viewport });
      });
    });
    return Promise.all(data.map(loadPage));
  })
  .catch((error) => {
    console.log('error: ', error);
  });

function loadPage(data) {
  const pageKey = data.engine + '_' + data.viewport.name;
  const dest = path.join(destDir, pageKey);
  const args = ['./bin/load-page.js',
    '--url="' + data.config.url + '"',
    '--selector="' + data.config.selector + '"',
    '--dest="' + dest + '"',
    '--engine="' + data.engine + '"',
    '--width="' + data.viewport.viewport.width + '"'];
  let cmd = 'casperjs';
  if (data.engine === 'slimerjs') {
    //			cmd = 'xvfb-run -a -e ./xvfb-run.stdout casperjs';
    cmd = 'xvfb-run -a casperjs';
    //			cmd = 'casperjs';
  }
  return new Promise((resolve, reject) => {
    console.log('starting: ' +
      data.config.url + ' ' +
      data.config.selector + ' with ' +
      data.engine + ' ' +
      data.viewport.name);
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
      console.log(pageKey + ': ' + data.trim());
    });
    loader.stderr.on('data', (data) => {
      console.log(pageKey + ' stderr: ' + data.trim());
    });
    loader.on('error', (err) => {
      console.log(pageKey + ' error: ' + err.trim());
    });
  });
}
