/**
 * ## Gulp server tasks
 *
 * @module gulp/server
 */
'use strict'

const gulp = require('gulp')
const server = require('gulp-develop-server')
const livereload = require('gulp-livereload')
const sequence = require('gulp-sequence')
const config = require('../lib/config')
const ipv4addresses = require('../lib/ipv4addresses.js')
const loadTasks = require('./lib/load-tasks')
const log = require('../lib/log')

const tasks = {
  /**
   * ### server restart and run tests
   *
   * @task server
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'server-restart': [['jsstandard'], (callback) => {
    if (process.env.NODE_ENV === 'development') {
      sequence(
        'server-changed',
        'tests',
        callback
      )
    } else {
      sequence(
        'server-changed',
        callback
      )
    }
  }],
  /**
   * ### server livereload task
   *
   * @task livereload
   * @namespace tasks
   */
  'livereload': () => gulp.src(config.gulp.watch.livereload[0])
    // .pipe(changedInPlace({ howToDetermineDifference: 'modification-time' }))
    // .pipe(pipeLog({ message: 'livereload <%= file.path %>', title: 'Gulp livereload' }))
    .pipe(livereload({ quiet: true })),
  /**
   * ### server start task
   *
   * @task server-start
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'server-start': (callback) => {
    server.listen({
      path: config.server.server,
      env: { VERBOSE: config.server.verbose === true, FORCE_COLOR: 1 }
    },
    callback)
  },
  /**
   * ### server restart task
   *
   * @task server-restart
   * @namespace tasks
   * @param {function} callback - gulp callback
   */
  'server-changed': (callback) => {
    server.changed((error) => {
      if (!error) {
        livereload.changed({ path: '/', quiet: false })
      }
      callback()
    })
  },
  /**
   * ### server livereload start task
   *
   * @task livereload-start
   * @namespace tasks
   */
  'livereload-start': () => {
    livereload.listen({ port: config.server.livereloadPort, delay: 2000, quiet: false })
    log.info('livereload listening on http://' +
      ipv4addresses.get()[0] + ':' + config.server.livereloadPort)
  }
}

loadTasks.importTasks(tasks)
