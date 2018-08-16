/**
 * ## Gulp test tasks
 *
 * @module gulp/test
 */
'use strict';

const exec = require('child_process').exec,
  gulp = require('gulp'),
  gulpExec = require('gulp-exec'),
  notify = require('gulp-notify'),
  sequence = require('gulp-sequence'),
  path = require('path'),
  config = require('../lib/config'),
  filePromises = require('./lib/files-promises'),
  loadTasks = require('./lib/load-tasks')
  ;

/**
 * log only to console, not GUI
 *
 * @param {pbject} options - setting options
 * @param {function} callback - gulp callback
 */
const log = notify.withReporter((options, callback) => {
  callback();
});

const tasks = {
  /**
   * ### test
   *
   * @task test
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'tests': (callback) => {
    sequence(
      'test-responsive-check-default',
      callback
    );
  },
  /**
   * ### test test-responsive-check-default
   *
   * @task test
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'test-responsive-check-default': [['jshint'], (callback) => {
    sequence(
      'test-responsive-check-default-exec',
      'livereload',
      callback
    );
  }],
  /**
   * ### test test-responsive-check-default-exec
   *
   * @task test
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'test-responsive-check-default-exec': () => {
      const options = {
        continueOnError: false, // default = false, true means don't emit error event
        pipeStdout: false // default = false, true means stdout is written to file.contents
      };
      const reportOptions = {
        err: true, // default = true, false means don't write err
        stderr: true, // default = true, false means don't write stderr
        stdout: true // default = true, false means don't write stdout
      };
      return gulp.src(config.gulp.watch['test-responsive-check-default'][0])
        .pipe(log({ message: 'executing default test',
                    title: 'Gulp test-responsive-check-default' }))
        .pipe(gulpExec('node index.js default.js', options))
        .pipe(gulpExec.reporter(reportOptions))
        ;
    },
  /**
   * ### test-responsive-check
   *
   * @task test-vcards
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'test-responsive-check': (callback) => {
    sequence(
      'test-responsive-check-exec',
      'livereload',
      callback
    );
  },
  /**
   * ### test-responsive-check-exec
   *
   * @task test-vcards
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'test-responsive-check-exec2': (callback) => {
    Promise.all(config.gulp['test-responsive-check'].map(filePromises.getFilenames))
    .then((filenames) => [].concat(...filenames)) // jscs:ignore jsDoc
    .then(filePromises.getRecentFiles)
    .then((filenames) => { // jscs:ignore jsDoc
      const self = gulp.src(filenames, { read: false })
      // `gulp-mocha` needs filepaths so you can't have any plugins before it
      //.pipe(mocha({ reporter: 'tap', timeout: 4000 })) // timeout for Raspberry Pi 3
      .on('error', function () { // jscs:ignore jsDoc
        self.emit('end');
      })
      .pipe(log({ message: 'untested: <%= file.path %>', title: 'Gulp test-responsive-check' }));
      return self;
    })
    .then(() => { // jscs:ignore jsDoc
      callback();
    })
    .catch(err => console.log(err)) // jscs:ignore jsDoc
    ;
  },

  /**
   * ### test-responsive-check-exec test task
   *
   * @task test-e2e-workflow-modules-exec
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'test-responsive-check-exec': (callback) => {
    Promise.all(config.gulp['test-responsive-check'].map(filePromises.getFilenames))
    .then((filenames) => [].concat(...filenames)) // jscs:ignore jsDoc
    .then(filePromises.getRecentFiles)
    .then((filenames) => Promise.all(
        filenames.map(runModule)
      )
    )
    .then(() => { callback();});
  }
};

/**
 * start module test
 *
 * @param {array} files - list with glob paths
 */
const runModule = (filename) => {
  console.log(filename.replace(/.*config\//, ''));
  return new Promise((resolve, reject) => {
    const loader = exec('export FORCE_COLOR=1; ' +
      'node index.js ' + filename.replace(/.*config\//, ''),
      { cwd: path.join(__dirname, '..') });
    loader.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });
    loader.stderr.on('data', (data) => {
      console.log('stderr: ' + data.toString().trim());
    });
    loader.on('error', (err) => {
      console.log('error: ' + err.toString().trim());
    });
    loader.on('close', (code) => {
      if (code > 0) {
        console.log('test-e2e-workflow-default exit-code: ' + code);
        reject();
      }
      resolve();
    });
  });
};

if (process.env.NODE_ENV == 'development') {
  loadTasks.importTasks(tasks);
}
