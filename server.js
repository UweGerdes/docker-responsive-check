/*
 * Start a HTTP server for responsive-check
 *
 * (c) Uwe Gerdes, entwicklung@uwegerdes.de
 */
'use strict'

const bodyParser = require('body-parser')
const exec = require('child_process').exec
const express = require('express')
const fs = require('fs')
const glob = require('glob')
const makeDir = require('make-dir')
const logger = require('morgan')
const path = require('path')
const config = require('./lib/config')
const ipv4addresses = require('./lib/ipv4addresses')

const app = express()

const httpPort = process.env.RESPONSIVE_CHECK_HTTP || 8080
const gulpLivereloadPort = process.env.GULP_LIVERELOAD_PORT || 8081

const verbose = config.server.verbose

const baseDir = '/results'
const configDir = path.join(__dirname, 'config')
const resultsDir = path.join(__dirname, 'results')

const running = []

const configs = getConfigs()
const configs2 = getConfigs2()

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir)
}

// Log the requests
if (verbose) {
  app.use(logger('dev'))
}

// work on post requests
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Serve static files
app.use(express.static(path.join(__dirname, 'htdocs')))

/**
 * Route for results
 *
 * @param {Object} req - request
 * @param {Object} res - response
 */
app.get(/^(\/results\/.+)$/, (req, res) => {
  res.sendFile(path.join(__dirname, req.params[0]))
})

// Handle requests for result view
app.get(/^\/(config\/.+)$/, (req, res) => {
  const configFilename = req.params[0].replace(/config\//, '')
  const config = requireFile(req.params[0] + '.js')
  try {
    res.render('resultView.ejs', {
      configs: configs,
      configs2: configs2,
      configName: configFilename,
      config: config,
      httpPort: httpPort,
      gulpLivereloadPort: gulpLivereloadPort,
      baseDir: baseDir
    })
  } catch (e) {
    console.log(e)
    config.error = 'config file not found: ' + configFilename
    res.status(404)
      .send('config file not found: ' + configFilename)
  }
})

// Handle AJAX requests for run configs
app.get(/^\/start\/(.+)$/, function (req, res) {
  runConfig(req.params[0], res)
})

// Route for root dir
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'))
})

// Route for everything else.
app.get('*', function (req, res) {
  res.status(404).send('Sorry cant find that: ' + req.url)
})

// Fire it up!
app.listen(httpPort)

console.log('responsive-check server listening on http://' + ipv4addresses.get()[0] + ':' + httpPort)

// get configurations
function getConfigs () {
  const configs = []
  fs.readdirSync(configDir).forEach(function (fileName) {
    if (fileName.indexOf('.js') > 0) {
      const configName = fileName.replace(/\.js/, '')
      configs.push(configName)
    }
  })
  return configs
}

/**
 * get configuration files and labels
 */
function getConfigs2 () {
  let configs = {}
  config.gulp['test-responsive-check'].forEach(
    (path) => {
      const paths = glob.sync(path)
      if (paths.length > 0) { // TODO use more than one label
        const label = paths[0].replace(/.+modules\/([^/]+).+/, '$1')
        configs[label] = paths.map((path) => path.replace(/.+\/([^/]+)\.js/, '$1'))
      }
    }
  )
  return configs
}

// start compare-layouts with config file
function runConfig (config, res) {
  const destDir = path.join(__dirname, 'results', config)
  const logfilePath = path.join(destDir, 'result.log')
  const log = function (msg) {
    console.log(msg)
    fs.appendFileSync(logfilePath, msg + '\n')
    res.write(replaceAnsiColors(msg).replace(/\n/, '<br />\n') + '<br />\n')
  }
  if (!fs.existsSync(destDir)) {
    makeDir(destDir)
  }
  res.write('<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8" />\n<title>' + config +
    '</title>\n<link href="/css/app.css" rel="stylesheet" />\n</head>\n<body>\n<div ' +
    'class="runView">\n')

  running.push(config)
  if (fs.existsSync(logfilePath)) {
    fs.unlinkSync(logfilePath)
  }
  const loader = exec('node index.js ' + config + '.js')
  loader.stdout.on('data', function (data) { log(data.toString().trim()) })
  loader.stderr.on('data', function (data) { log(data.toString().trim()) })
  loader.on('error', function (err) { log(' error: ' + err.toString().trim()) })
  loader.on('close', function (code) {
    if (code > 0) {
      log('load ' + config + ' error, exit-code: ' + code)
    }
    log('server finished ' + config)
    running.splice(running.indexOf(config), 1)
    res.write('</div>\n</body>\n</html>\n')
    if (running.length === 0) {
      res.end()
    }
  })
}

function replaceAnsiColors (string) {
  let result = ''
  const replaceTable = {
    '0': 'none',
    '1': 'font-weight: bold',
    '4': 'text-decoration: underscore',
    '5': 'text-decoration: blink',
    '7': 'text-decoration: reverse',
    '8': 'text-decoration: concealed',
    '30': 'color: black',
    '31': 'color: red',
    '32': 'color: green',
    '33': 'color: yellow',
    '34': 'color: blue',
    '35': 'color: magenta',
    '36': 'color: cyan',
    '37': 'color: white',
    '40': 'background-color: black',
    '41': 'background-color: red',
    '42': 'background-color: green',
    '43': 'background-color: yellow',
    '44': 'background-color: blue',
    '45': 'background-color: magenta',
    '46': 'background-color: cyan',
    '47': 'background-color: white'
  }
  string.toString().split(/(\x1B\[[0-9;]+m)/).forEach(function (part) { // eslint-disable-line
    if (part.match(/(\x1B\[[0-9;]+m)/)) { // eslint-disable-line
      part = part.replace(/\x1B\[([0-9;]+)m/, '$1') // eslint-disable-line
      if (part === '0') {
        result += '</span>'
      } else {
        result += '<span style="'
        part.split(/(;)/).forEach(function (x) {
          if (replaceTable[x]) {
            result += replaceTable[x]
          } else {
            result += x
          }
        })
        result += '">'
      }
    } else {
      result += part
    }
  })
  return result
}

/**
 * get js file content
 *
 * @private
 * @param {String} filename - config filename
 */
function requireFile (filename) {
  delete require.cache[require.resolve('./' + filename)]
  if (fs.existsSync('./' + filename)) {
    return require('./' + filename)
  } else {
    console.log('server require ./' + filename + ' not found')
  }
}
