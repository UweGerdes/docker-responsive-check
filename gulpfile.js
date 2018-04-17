/*
 * gulpfile for responsive-check
 *
 * (c) Uwe Gerdes, entwicklung@uwegerdes.de
 */
'use strict';

const autoprefixer = require('gulp-autoprefixer'),
  glob = require('glob'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  gulpChangedInPlace = require('gulp-changed-in-place'),
  gulpExec = require('gulp-exec'),
  jscs = require('gulp-jscs'),
  stylish = require('gulp-jscs-stylish'),
  jshint = require('gulp-jshint'),
  jsonlint = require('gulp-jsonlint'),
  less = require('gulp-less'),
  lesshint = require('gulp-lesshint'),
  gulpLivereload = require('gulp-livereload'),
  notify = require('gulp-notify'),
  path = require('path'),
  postMortem = require('gulp-postmortem'),
  os = require('os'),
  runSequence = require('run-sequence'),
  server = require('gulp-develop-server'),
  uglify = require('gulp-uglify')
  ;

const appDir = __dirname;
const watchFilesFor = {};
const gulpLivereloadPort = process.env.GULP_LIVERELOAD_PORT || 8081;
let exitCode = 0;

/*
 * log only to console, not GUI
 */
const log = notify.withReporter(function (options, callback) {
  callback();
});

/*
 * less files lint and style check
 */
watchFilesFor['less-lint'] = [
  path.join(appDir, 'less', '**', '*.less')
];
gulp.task('less-lint', function () {
  return gulp.src(watchFilesFor['less-lint'])
    .pipe(lesshint())  // enforce style guide
    .on('error', log.onError({
      message: 'Error: <%= error.message %>',
      title: 'LESS-Lint Error' }))
    .on('warning', log.onError({
      message: 'Warning: <%= error.message %>',
      title: 'LESS-Lint Warning' }))
    .pipe(lesshint.reporter())
    ;
});

watchFilesFor.less = [
  path.join(appDir, 'less', '**', '*.less'),
  path.join(appDir, 'less', 'app.less')
];
gulp.task('less', function () {
  const src = watchFilesFor.less.filter(function (el) { return el.indexOf('/**/') == -1; });
  return gulp.src(src)
    .pipe(less())
    .on('error', log.onError({ message: 'Error: <%= error.message %>', title: 'LESS Error' }))
    .on('warning', log.onError({ message: 'Warning: <%= error.message %>', title: 'LESS Warning' }))
    .pipe(autoprefixer('last 3 version', 'safari 5', 'ie 8', 'ie 9', 'ios 6', 'android 4'))
    .pipe(gutil.env.type === 'production' ? uglify() : gutil.noop())
    .pipe(gulp.dest(path.join(appDir, 'css')))
    .pipe(log({ message: 'written: <%= file.path %>', title: 'Gulp less' }))
    ;
});

/*
 * lint json files
 */
watchFilesFor.jsonlint = [
  path.join(appDir, '.jshintrc'),
  path.join(appDir, '.jscsrc'),
  path.join(appDir, '**', '*.json')
];
gulp.task('jsonlint', function () {
  return gulp.src(watchFilesFor.jsonlint)
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    ;
});

/*
 * lint javascript files
 */
watchFilesFor.lint = [
  path.join(appDir, '**', '*.js')
];
gulp.task('lint', function () {
  return gulp.src(watchFilesFor.lint)
    .pipe(jshint())
    .pipe(jscs())
    .pipe(stylish.combineWithHintResults())
    .pipe(jshint.reporter('jshint-stylish'))
    ;
});

watchFilesFor['test-default'] = [
  path.join(appDir, 'config', 'default.js'),
  path.join(appDir, 'index.js'),
  path.join(appDir, 'bin', 'load-page.js')
];
gulp.task('test-default', ['lint'], function () {
  const options = {
    continueOnError: false, // default = false, true means don't emit error event
    pipeStdout: false // default = false, true means stdout is written to file.contents
  };
  const reportOptions = {
    err: true, // default = true, false means don't write err
    stderr: true, // default = true, false means don't write stderr
    stdout: true // default = true, false means don't write stdout
  };
  return gulp.src(watchFilesFor['test-default'])
    .pipe(gulpChangedInPlace({ howToDetermineDifference: 'modification-time' }))
    .pipe(log({ message: 'file changed: <%= file.path %>, executing default test',
                title: 'Gulp test-default' }))
    .pipe(gulpExec('node index.js default.js', options))
    .pipe(gulpExec.reporter(reportOptions))
    .pipe(gulpLivereload({ quiet: true }))
    .pipe(log({ message: 'livereload: <%= file.path %>', title: 'Gulp test-default' }))
    ;
});

// start responsive-check server
gulp.task('server:start', function () {
  server.listen({
      path: path.join(appDir, 'server.js'),
      env: { VERBOSE: false },
      cwd: appDir
    }
  );
});
gulp.task('server:stop', function () {
  server.kill();
});
// restart server if server.js changed
watchFilesFor.server = [
  path.join(appDir, 'server.js')
];
gulp.task('server', function () {
  server.changed(function (error) {
    if (error) {
      console.log('responsive-check server.js restart error: ' + JSON.stringify(error, null, 4));
    }
  });
});
/*
 * gulp postmortem task to stop server on termination of gulp
 */
gulp.task('server-postMortem', function () {
  return gulp.src(watchFilesFor.server)
    .pipe(postMortem({ gulp: gulp, tasks: ['server:stop'] }))
    ;
});

/*
 * livereload server and task
 */
watchFilesFor.livereload = [
  path.join(appDir, 'views', '*.ejs'),
  path.join(appDir, 'css', '*.css')
];
gulp.task('livereload', function () {
  gulp.src(watchFilesFor.livereload)
    .pipe(gulpChangedInPlace({ howToDetermineDifference: 'modification-time' }))
    .pipe(log({ message: 'livereload: <%= file.path %>', title: 'Gulp livereload' }))
    .pipe(gulpLivereload({ quiet: true }));
});

/*
 * run all build tasks
 */
gulp.task('build', function (callback) {
  runSequence('less-lint',
    'jsonlint',
    'less',
    // 'lint', // 'test-default' starts 'lint'
    'test-default', // dry run for gulpChangedInPlace
    callback);
});

/*
 * watch task
 */
gulp.task('watch', function () {
  Object.keys(watchFilesFor).forEach(function (task) {
    watchFilesFor[task].forEach(function (filename) {
      glob(filename, function (err, files) {
        if (err) {
          console.log(filename + ' error: ' + JSON.stringify(err, null, 4));
        }
        if (files.length === 0) {
          console.log(filename + ' not found');
        }
      });
    });
    gulp.watch(watchFilesFor[task], [task]);
  });
  gulpLivereload.listen({ port: gulpLivereloadPort, delay: 2000 });
  console.log('gulp livereload listening on http://' + ipv4adresses()[0] +
    ':' + gulpLivereloadPort);
});

/*
 * init task: start server
 */
gulp.task('init', function (callback) {
  runSequence('less',
    'server:start',
    'server-postMortem',
    callback);
});

/*
 * default task: run all build tasks and watch
 */
gulp.task('default', function (callback) {
  runSequence('build',
    'server:start',
    'watch',
    'server-postMortem',
    callback);
});

process.on('exit', function () {
  process.exit(exitCode);
});

function ipv4adresses() {
  const addresses = [];
  const interfaces = os.networkInterfaces();
  for (let k in interfaces) {
    if (interfaces.hasOwnProperty(k)) {
      for (let k2 in interfaces[k]) {
        if (interfaces[k].hasOwnProperty(k2)) {
          const address = interfaces[k][k2];
          if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
          }
        }
      }
    }
  }
  return addresses;
}
module.exports = {
  gulp: gulp,
  watchFilesFor: watchFilesFor
};
