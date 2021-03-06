/**
 * @module gulp/lint
 */
'use strict'

const gulp = require('gulp')
const cache = require('gulp-cached')
const jsonlint = require('gulp-jsonlint')
const lesshint = require('gulp-lesshint')
const notify = require('gulp-notify')
const pugLinter = require('gulp-pug-linter')
const sequence = require('gulp-sequence')
const standard = require('gulp-standard')
const yamlValidate = require('gulp-yaml-validate')
const jshint = require('jshint').JSHINT
const config = require('../lib/config')
const filePromises = require('./lib/files-promises')
const loadTasks = require('./lib/load-tasks')

/**
 * log only to console, not GUI
 *
 * @param {pbject} options - setting options
 * @param {function} callback - gulp callback
 */
const log = notify.withReporter((options, callback) => {
  callback()
})

const tasks = {
  /**
   * ### Default gulp lint task
   *
   * @task lint
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'lint': (callback) => {
    sequence(
      'jsonlint',
      'jsstandard',
      'lesshint',
      'yamllint',
      'puglint',
      'ejslint',
      callback
    )
  },
  /**
   * #### Lint js files
   *
   * apply jsstandard to js files
   *
   * @task jsstandard
   * @namespace tasks
   */
  'jsstandard': () => gulp.src(config.gulp.watch.jsstandard)
    .pipe(cache('jsstandard'))
    // .pipe(log({ message: 'linting: <%= file.path %>', title: 'Gulp jsstandard' }))
    .pipe(standard())
    .pipe(standard.reporter('default', {
      breakOnError: true,
      quiet: true
    })),
  /**
   * #### Lint json files
   *
   * apply lesshint json files
   *
   * @task jsonlint
   * @namespace tasks
   */
  'jsonlint': () => gulp.src(config.gulp.watch.jsonlint)
    .pipe(jsonlint())
    .pipe(jsonlint.reporter()),
  /**
   * #### Lint less files
   *
   * apply lesshint to less files
   *
   * @task lesshint
   * @namespace tasks
   */
  'lesshint': () => gulp.src(config.gulp.watch.lesshint)
    .pipe(lesshint())
    .on('error', log.onError({
      message: 'Error: <%= error.message %>',
      title: 'LESS-Lint Error' }))
    .on('warning', log.onError({
      message: 'Warning: <%= error.message %>',
      title: 'LESS-Lint Warning' }))
    .pipe(lesshint.reporter())
    .pipe(lesshint.failOnError()),
  /**
   * #### Lint yaml files
   *
   * apply yamlValidate to yaml files
   *
   * @task yamllint
   * @namespace tasks
   */
  'yamllint': () => gulp.src(config.gulp.watch.yamllint)
    .pipe(yamlValidate({ space: 2 }))
    .on('error', (msg) => {
      console.log(msg)
    }),
  /**
   * #### Lint pug files
   *
   * apply pug-linter to pug files
   *
   * @task puglint
   * @namespace tasks
   */
  'puglint': () => gulp.src(config.gulp.watch.puglint)
    .pipe(pugLinter())
    .pipe(pugLinter.reporter('fail')),
  /**
   * #### Lint ejs files
   *
   * validate ejs files
   * - replace `<%=`, `<%-` tags with output = [expression];
   * - strip non ejs html and `<%` and `%>`
   * - keep lines for counting
   *
   * options are supplied here - TODO use .ejslintrc
   *
   * @task ejslint
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'ejslint': (callback) => {
    Promise.all(config.gulp.watch.ejslint.map(filePromises.getFilenames))
      .then((filenames) => [].concat(...filenames))
      .then((filenames) =>
        Promise.all(
          filenames.map(filePromises.getFileContent)
        )
      )
      .then((files) =>
        Promise.all(
          files.map(replaceOutputTags)
        )
      )
      .then((files) =>
        Promise.all(
          files.map(replaceEjsTags)
        )
      )
      .then((files) =>
        Promise.all(
          files.map(fileJsHint)
        )
      )
      .then((files) =>
        Promise.all(
          files.map(report)
        )
      )
      .then(() => {
        callback()
      })
  }
}

// some Promises for ejslint

/**
 * Replace expression output tags
 *
 * @private
 * @param {function} file - file object with contents
 */
const replaceOutputTags = (file) =>
  new Promise((resolve) => {
    file.noOutput = '<% var output, output_raw; %>' + file.content
      .replace(/<%= *(.+?) *%>/g, '<% output = $1; %>')
      .replace(/<%- *(.+?) *%>/g, '<% output_raw = $1; %>')
    resolve(file)
  })

/**
 * Replace html outside of ejs tags with returns
 *
 * @private
 * @param {function} file - file object with contents
 */
const replaceEjsTags = (file) =>
  new Promise((resolve) => {
    let parts = file.noOutput.split(/<%/)
    let output = []
    parts.forEach((part) => {
      let snips = part.split(/%>/)
      output.push(snips[0])
      output.push(snips.join('%>').replace(/[^\n]/g, ''))
    })
    file.jsCode = output.join('')
    resolve(file)
  })

/**
 * jshint the remaining content
 *
 * @private
 * @param {function} file - file object with contents
 */
const fileJsHint = (file) =>
  new Promise((resolve) => {
    jshint(file.jsCode, { esversion: 6, asi: true }, { })
    if (jshint.errors) {
      file.errors = jshint.errors
    }
    file.jshint = jshint.data()
    resolve(file)
  })

/**
 * report errors
 *
 * @private
 * @param {function} file - file object with contents
 */
const report = (file) =>
  new Promise((resolve) => {
    if (file.jshint.errors) {
      console.log('ERRORS in ' + file.filename)
      file.jshint.errors.forEach((error) => {
        console.log('ERROR: ' + error.line + '/' + error.character + ' ' + error.reason)
      })
    }
    resolve(file)
  })

if (process.env.NODE_ENV === 'development') {
  loadTasks.importTasks(tasks)
} else {
  loadTasks.importTasks({ jsstandard: () => { } })
}
