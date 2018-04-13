/*
 * Start a HTTP servers for responsive-check
 *
 * node server.js
 *
 * config files in ./config
 * results in ./results
 *
 * (c) Uwe Gerdes, entwicklung@uwegerdes.de
 */
'use strict';

var bodyParser = require('body-parser'),
  exec = require('child_process').exec,
  express = require('express'),
  fs = require('fs'),
  logger = require('morgan'),
  os = require('os'),
  path = require('path');

var app = express();

var httpPort = process.env.RESPONSIVE_CHECK_HTTP || 8080,
  gulpLivereloadPort = process.env.GULP_LIVERELOAD_PORT || 8081,
  verbose = (process.env.VERBOSE == 'true'),
  baseDir = '/results';

var configDir = path.join(__dirname, 'config'),
  resultsDir = path.join(__dirname, 'results');

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

var running = [],
  configs = getConfigs();

// Log the requests
if (verbose) {
  app.use(logger('dev'));
}

// work on post requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Serve static files
app.use(express.static(__dirname));

// Handle form post requests for result view
app.get('/results/:config', function(req, res){
  var config = {};
  if (req.params.config) {
    var configFilename = path.join(configDir, req.params.config + '.js');
    if(fs.existsSync(configFilename)) {
      config = require(configFilename);
      res.render('resultView.ejs', {
        configs: configs,
        configName: req.params.config,
        config: config,
        httpPort: httpPort,
        gulpLivereloadPort: gulpLivereloadPort,
        baseDir: baseDir
      });
    } else {
      config.error = 'config file not found: ' + configFilename;
      res.status(404)
        .send('config file not found: ' + configFilename);
    }
  }
});

// Handle AJAX requests for run configs
app.get('/start/:config', function(req, res){
  runConfig(req.params.config, res);
});

// Route for root dir
app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for everything else.
app.get('*', function(req, res){
  res.status(404).send('Sorry cant find that: ' + req.url);
});

// Fire it up!
app.listen(httpPort);

// Get IP for console message
function ipv4adresses() {
	var addresses = [];
	var interfaces = os.networkInterfaces();
	for (var k in interfaces) {
		if (interfaces.hasOwnProperty(k)) {
			for (var k2 in interfaces[k]) {
				if (interfaces[k].hasOwnProperty(k2)) {
					var address = interfaces[k][k2];
					if (address.family === 'IPv4' && !address.internal) {
						addresses.push(address.address);
					}
				}
			}
		}
	}
	return addresses;
}
var addresses = ipv4adresses();

// console.log("IP addresses of container:  ", addresses);
console.log('responsive-check server listening on http://' + addresses[0] + ':' + httpPort);

// get configurations
function getConfigs() {
  configs = [];
  fs.readdirSync(configDir).forEach(function(fileName) {
    var configName = fileName.replace(/\.js/, '');
    configs.push(configName);
  });
  return configs;
}

// start compare-layouts with config file
function runConfig(config, res) {
  var destDir = path.join(__dirname, 'results', config);
  var logfilePath = path.join(destDir, 'result.log');
  var log = function (msg) {
    console.log(msg);
    fs.appendFileSync(logfilePath, msg + '\n');
    res.write(replaceAnsiColors(msg).replace(/\n/, '<br />\n') + '<br />\n');
  };
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
  }
  res.write('<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8" />\n<title>' + config + '</title>\n<link href="/css/app.css" rel="stylesheet" />\n</head>\n<body>\n<div class="runView">\n');

  running.push(config);
  if (fs.existsSync(logfilePath)) {
    fs.unlinkSync(logfilePath);
  }
  var loader = exec('node index.js ' + 'config/' + config + '.js');
  loader.stdout.on('data', function(data) { log(data.toString().trim()); });
  loader.stderr.on('data', function(data) { log(data.toString().trim()); });
  loader.on('error', function(err) { log(' error: ' + err.toString().trim()); });
  loader.on('close', function(code) {
    if (code > 0) {
      log('load ' + config + ' error, exit-code: ' + code);
    }
    log('server finished ' + config);
    running.splice(running.indexOf(config), 1);
    res.write('</div>\n</body>\n</html>\n');
    if (running.length === 0) {
      res.end();
    }
  });
}

function replaceAnsiColors(string) {
  var result = '';
  var replaceTable = {
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
  };
  string.toString().split(/(\x1B\[[0-9;]+m)/).forEach(function(part) {
    if (part.match(/(\x1B\[[0-9;]+m)/)) {
      part = part.replace(/\x1B\[([0-9;]+)m/, '$1');
      if (part == '0') {
        result += '</span>';
      } else {
        result += '<span style="';
        part.split(/(;)/).forEach(function(x) {
          if (replaceTable[x]) {
            result += replaceTable[x];
          } else {
            result += x;
          }
        });
        result += '">';
      }
    } else {
      result += part;
    }
  });
  return result;
}
