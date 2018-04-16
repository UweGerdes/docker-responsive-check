/*
 * load html pages in different screen widths
 *
 * node index.js config/<configname>.js
 *
 * (c) Uwe Gerdes, entwicklung@uwegerdes.de
 */

'use strict';

const exec = require('child_process').exec,
//  del = require('del'),
  fs = require('fs'),
  path = require('path');

let configFile = 'config/default.js';
const timeout = 40000;

if (process.argv[2]) {
  configFile = process.argv[2];
}
const config = require('./' + configFile);

let verbose = false;

const resultsDir = './results';
const destDir = path.join(resultsDir, config.destDir);
let pagesExpected = [];
let pagesLoaded = [];

/*
console.log(path.join(destDir, '**'));
del( [ path.join(destDir, '*') ], { force: true } )
	.then(load());
*/

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}
fs.stat(destDir, (err, stats) => {
  if (!stats) {
    fs.mkdir(destDir,
      (err, data) => {
        if (err)  { throw err; }
        if (data) { console.log(data); }
        console.log('directory "' + destDir + '" created');
        load();
      }
    );
    console.log('creating directory "' + destDir + '"');
  } else {
    if (!stats.isDirectory()) {
      console.log(destDir + ' exists but is not a directory - exiting');
    } else {
      load();
    }
  }
});

function load() {
  config.engines.forEach((engine) => {
    config.viewports.forEach((viewport) => {
      pagesExpected.push(getPageKey(engine, viewport.name));
      loadPage(config, engine, viewport, addResult);
    });
  });
}

function loadPage(config, engine, viewport, callback) {
  const pageKey = getPageKey(engine, viewport.name);
  const dest = path.join(destDir, pageKey);
  const page = {
    'loaded': false
  };
  const args = ['./bin/load-page.js',
    '--url="' + config.url + '"',
    '--selector="' + config.selector + '"',
    '--dest="' + dest + '"',
    '--engine="' + engine + '"',
    '--width="' + viewport.viewport.width + '"'];
  let cmd = 'casperjs';
  if (engine === 'slimerjs') {
    //			cmd = 'xvfb-run -a -e ./xvfb-run.stdout casperjs';
    cmd = 'xvfb-run -a casperjs';
    //			cmd = 'casperjs';
  }
  if (verbose) {
    console.log('starting: ' + cmd + ' ' + args.join(' '));
  } else {
    console.log('starting: ' + config.url + ' / ' + config.selector +
                ' with ' + engine + ' ' + viewport.name);
  }
  const loader = exec(cmd + ' ' + args.join(' '), { timeout: timeout },
    (error, stdout, stderr) => {
      logExecResult('loaded page ' + page.url, error, '', stderr);
    }
  );
  loader.stdout.on('data', (data) => { console.log(pageKey + ': ' + data.trim()); });
  loader.stderr.on('data', (data) => { console.log(pageKey + ' stderr: ' + data.trim()); });
  loader.on('error', (err) => { console.log(pageKey + ' error: ' + err.trim()); });
  loader.on('close', (code) => {
    if (code > 0) {
      console.log('load ' + page.url + ' exit: ' + code);
    }
    page.loaded = true;
    callback(config.url, config.selector, engine, viewport);
  });
}

const addResult = (url, selector, engine, viewport) => {
  pagesLoaded.push(getPageKey(engine, viewport.name));
  console.log('finished: ' + url + ' / ' + selector + ' with ' + engine + ' ' + viewport.name);
  if (pagesExpected.length === pagesLoaded.length) {
    console.log('finished all');
    fs.appendFileSync(destDir + '/result.log', config.baseUrl + ' ' +
                      selector + ' pages completely loaded\n');
    // TODO create result page and trigger livereload
    //createHtmlPage(config, pagesLoaded);
  }
};

function logExecResult(msgStart, error, stdout, stderr) {
  if (stdout.length > 0) { console.log(msgStart + ' stdout: ' + stdout.trim()); }
  if (stderr.length > 0) { console.log(msgStart + ' stderr: ' + stderr.trim()); }
  if (error !== null) { console.log(msgStart + ' error:\n' + JSON.stringify(error, undefined, 4)); }
}

function getPageKey(engine, name) {
  return engine + '_' + name;
}

