/*
 * gulpfile for responsive-check
 *
 * (c) Uwe Gerdes, entwicklung@uwegerdes.de
 */
'use strict';

var autoprefixer = require('gulp-autoprefixer'),
	changed = require('gulp-changed'),
	del = require('del'),
	exec = require('child_process').exec,
	fs = require('fs'),
	glob = require('glob'),
	gulp = require('gulp'),
	gutil = require('gulp-util'),
	jshint = require('gulp-jshint'),
	lessChanged = require('gulp-less-changed'),
	lesshint = require('gulp-lesshint'),
	less = require('gulp-less'),
	gulpLivereload = require('gulp-livereload'),
	notify = require('gulp-notify'),
	path = require('path'),
	postMortem = require('gulp-postmortem'),
	os = require('os'),
	rename = require('rename'),
	runSequence = require('run-sequence'),
	server = require('gulp-develop-server'),
	uglify = require('gulp-uglify')
	;

var appDir = __dirname;
var testLogfile = path.join(appDir, 'tests.log');
var testHtmlLogfile = path.join(appDir, 'tests.html');
var logMode = 0;
var txtLog = [];
var htmlLog = [];
var watchFilesFor = {};
var gulpLivereloadPort = process.env.GULP_LIVERELOAD_PORT || 8081;
var exitCode = 0;

/*
 * log only to console, not GUI
 */
var log = notify.withReporter(function (options, callback) {
	callback();
});

/*
 * less files lint and style check
 */
watchFilesFor['less-lint'] = [
	path.join(appDir, 'less', '**', '*.less')
];
gulp.task('less-lint', function () {
	return gulp.src( watchFilesFor['less-lint'] )
		.pipe(lesshint())  // enforce style guide
		.on('error', function (err) {})
		.pipe(lesshint.reporter())
		;
});

watchFilesFor.less = [
	path.join(appDir, 'less', '**', '*.less'),
	path.join(appDir, 'less', 'app.less')
];
gulp.task('less', function () {
	var dest = function(filename) {
		return path.join(path.dirname(path.dirname(filename)), 'css');
	};
	var src = watchFilesFor.less.filter(function(el){return el.indexOf('/**/') == -1; });
	return gulp.src( src )
		.pipe(lessChanged({
			getOutputFileName: function(file) {
				return rename( file, { dirname: dest(file), extname: '.css' } );
			}
		}))
		.pipe(less())
		.on('error', log.onError({ message:  'Error: <%= error.message %>' , title: 'LESS Error'}))
		.on('warning', log.onError({ message:  'Warning: <%= error.message %>' , title: 'LESS Warning'}))
		.pipe(autoprefixer('last 3 version', 'safari 5', 'ie 8', 'ie 9', 'ios 6', 'android 4'))
		.pipe(gutil.env.type === 'production' ? uglify() : gutil.noop())
		.pipe(gulp.dest(function(file) { return dest(file.path); }))
		.pipe(log({ message: 'written: <%= file.path %>', title: 'Gulp less' }))
		;
});

/*
 * lint javascript files
 */
watchFilesFor.lint = [
	path.join(appDir, 'package.json'),
	path.join(appDir, '**', '*.js')
];
gulp.task('lint', function(callback) {
	return gulp.src(watchFilesFor.lint)
		.pipe(jshint())
		.pipe(jshint.reporter('default'))
		;
});

watchFilesFor['test-default'] = [
	path.join(appDir, 'config', 'default.js'),
	path.join(appDir, 'index.js'),
	path.join(appDir, 'bin', 'load-page.js')
];
gulp.task('test-default', function(callback) {
	var loader = exec('node index.js config/default.js',
		{ cwd: appDir },
		function (err, stdout, stderr) {
			logExecResults(err, stdout, stderr);
			callback();
		}
	);
	loader.stdout.on('data', function(data) { if(!data.match(/PASS/)) { console.log(data.trim()); } });
});

// helper functions
var logExecResults = function (err, stdout, stderr) {
	logTxt (stdout.replace(/\u001b\[[^m]+m/g, '').match(/[^\n]*FAIL [^\n]+/g));
	logHtml(stdout.replace(/\u001b\[[^m]+m/g, '').match(/[^\n]*FAIL [^0-9][^\n]+/g));
	if (err) {
		console.log(err.toString());
		exitCode = 1;
	}
};

var logTxt = function (msg) {
	if (logMode === 1 && msg){
		var txtMsg = msg.join('\n');
		txtLog.push(txtMsg);
	}
};

var logHtml = function (msg) {
	if (logMode === 1 && msg){
		var htmlMsg = msg.join('<br />')
						.replace(/FAIL ([^ ]+) ([^ :]+)/, 'FAIL ./results/$1/$22.png')
						.replace(/([^ ]+\/[^ ]+\.png)/g, '<a href="$1">$1</a>');
		var errorClass = htmlMsg.indexOf('FAIL') > -1 ? ' class="fail"' : ' class="success"';
		htmlLog.push('\t<li' + errorClass + '>' + htmlMsg + '</li>');
	}
};

var writeTxtLog = function () {
	if (txtLog.length > 0) {
		fs.writeFileSync(testLogfile, txtLog.join('\n') + '\n');
	}
};

var writeHtmlLog = function () {
	if (htmlLog.length > 0) {
		var html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8" />\n' +
				'<title>Testergebnisse</title>\n' +
				'<link href="compare-layouts/css/index.css" rel="stylesheet" />\n' +
				'</head>\n<body><h1>Testergebnisse</h1>\n<ul>\n';
		html += htmlLog.join('\n');
		html += '</ul>\n</body>\n</html>';
		fs.writeFileSync(testHtmlLogfile, html);
	}
};

gulp.task('clearTestLog', function() {
	del([ testLogfile, testHtmlLogfile ], { force: true });
	logMode = 1;
});

gulp.task('logTestResults', function(callback) {
	if (txtLog.length > 0) {
		console.log('######################## TEST RESULTS ########################');
		console.log(txtLog.join('\n'));
	} else {
		console.log('######################## TEST SUCCESS ########################');
		logTxt (['SUCCESS gulp tests']);
	}
	writeTxtLog();
	writeHtmlLog();
	logMode = 0;
	callback();
});

// start responsive-check server
gulp.task('server-responsive-check:start', function() {
	server.listen({
			path: path.join(appDir, 'server.js'),
			env: { VERBOSE: false },
			cwd: appDir
		}
	);
});
gulp.task('server-responsive-check:stop', function() {
    server.kill();
});
// restart server-responsive-check if server.js changed
watchFilesFor['server-responsive-check'] = [
	path.join(appDir, 'server.js')
];
gulp.task('server-responsive-check', function() {
	server.changed(function(error) {
		if( error ) {
			console.log('responsive-check server.js restart error: ' + JSON.stringify(error, null, 4));
		} else {
			console.log('responsive-check server.js restarted');
		}
	});
});
/*
 * gulp postmortem task to stop server on termination of gulp
 */
gulp.task('server-postMortem', function() {
	return gulp.src( watchFilesFor['server-responsive-check'] )
		.pipe(postMortem({gulp: gulp, tasks: [ 'server-responsive-check:stop' ]}))
		;
});

/*
 * livereload server and task
 */
watchFilesFor.livereload = [
	path.join(appDir, 'views', '*.ejs'),
	path.join(appDir, 'css', '*.css'),
	path.join(appDir, 'results', '**', '*.log')
];
gulp.task('livereload', function() {
	gulp.src(watchFilesFor.livereload)
		.pipe(changed(path.dirname('<%= file.path %>')))
//		.pipe(log({ message: 'livereload: <%= file.path %>', title: 'Gulp livereload' }))
		.pipe(gulpLivereload( { quiet: true } ));
});

/*
 * run all build tasks
 */
gulp.task('build', function(callback) {
	runSequence('less-lint',
		'less',
		'lint',
		callback);
});

/*
 * watch task
 */
gulp.task('watch', function() {
	Object.keys(watchFilesFor).forEach(function(task) {
		watchFilesFor[task].forEach(function(filename) {
			glob(filename, function(err, files) {
				if (err) {
					console.log(filename + ' error: ' + JSON.stringify(err, null, 4));
				}
				if (files.length === 0) {
					console.log(filename + ' not found');
				}
			});
		});
		gulp.watch( watchFilesFor[task], [ task ] );
	});
	gulpLivereload.listen( { port: gulpLivereloadPort, delay: 2000 } );
	console.log('gulp livereload listening on http://' + ipv4adresses()[0] + ':' + gulpLivereloadPort);
});

/*
 * init task: start server
 */
gulp.task('init', function(callback) {
	runSequence('less',
		'server-responsive-check:start',
		'server-postMortem',
		callback);
});

/*
 * selftest task: run all build tasks, start server, execute default test and shut down
 *
 * TODO implement test task
 */
gulp.task('default', function(callback) {
	runSequence('build',
//		'server-responsive-check:start',
		'test',
//		'server-responsive-check:stop',
		callback);
});

/*
 * default task: run all build tasks and watch
 */
gulp.task('default', function(callback) {
	runSequence('build',
		'server-responsive-check:start',
		'watch',
		'server-postMortem',
		callback);
});

process.on('exit', function () {
	process.exit(exitCode);
});

function ipv4adresses() {
	var addresses = [];
	var interfaces = os.networkInterfaces();
	for (var k in interfaces) {
		for (var k2 in interfaces[k]) {
			var address = interfaces[k][k2];
			if (address.family === 'IPv4' && !address.internal) {
				addresses.push(address.address);
			}
		}
	}
	return addresses;
}

module.exports = {
	gulp: gulp,
	watchFilesFor: watchFilesFor
};
