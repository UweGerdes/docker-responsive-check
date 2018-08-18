/*
 * load html pages in different screen widths
 *
 * node index.js <configname>.js
 *
 * (c) Uwe Gerdes, entwicklung@uwegerdes.de
 */
'use strict'

const exec = require('child_process').exec
const del = require('del')
const makeDir = require('make-dir')
const path = require('path')
const conf = require('./lib/config')

const configDir = './config'
const resultsDir = './results'
const configFile = process.argv[2] || 'default.js'
const config = require(configDir + '/' + configFile)
const destDir = path.join(resultsDir, configFile.replace(/\.js$/, ''))

const timeout = 40000
const verbose = conf.server.verbose;

(async () => {
  let data = []
  config.engines.forEach((engine) => {
    config.viewports.forEach((viewport) => {
      data.push({ config: config, engine: engine, viewport: viewport })
    })
  })
  try {
    await makeDir(destDir)
    await del([path.join(destDir, '*.*')])
    data.forEach(async (entry) => {
      await loadPage(entry)
    })
  } catch (error) {
    console.log('error: ', error)
  }
})()

const loadPage = (data) => {
  const pageKey = data.engine + '_' + data.viewport.name
  const dest = path.join(destDir, pageKey)
  const args = ['./lib/load-page.js',
    '--url="' + data.config.url + '"',
    '--selector="' + data.config.selector + '"',
    '--dest="' + dest + '"',
    '--width="' + data.viewport.viewport.width + '"']
  let cmd = 'casperjs'
  if (data.engine === 'slimerjs') {
    // cmd = 'xvfb-run -a -e ./xvfb-run.stdout casperjs'
    cmd = 'xvfb-run -a casperjs'
    // cmd = 'casperjs'
  }
  return new Promise((resolve, reject) => {
    console.log('starting:', data.engine, data.viewport.name, args.join(' '))
    const loader = exec(cmd + ' ' + args.join(' '),
      { timeout: timeout },
      (error) => {
        if (error) {
          reject(error)
        }
        console.log('finished: ' +
          data.config.url + ' ' +
          data.config.selector + ' with ' +
          data.engine + ' ' +
          data.viewport.name
        )
        resolve({
          url: data.config.url,
          selector: data.config.selector,
          engine: data.engine,
          viewport: data.viewport
        })
      }
    )
    loader.stdout.on('data', (data) => {
      if (verbose) {
        console.log(pageKey + ': ' + data.trim())
      }
    })
    loader.stderr.on('data', (data) => {
      console.log(pageKey + ' stderr: ' + data.trim())
    })
    loader.on('error', (err) => {
      console.log(pageKey + ' error: ' + err.trim())
    })
  })
}
