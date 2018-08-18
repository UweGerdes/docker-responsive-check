/**
 * ## Log output helper
 *
 * @module lib/log
 * @private
 */
'use strict'

const chalk = require('chalk')
const dateFormat = require('dateformat')

module.exports = {
  /**
   * print timestamp and message to console
   *
   * @param {string} msg - output message
   */
  info: (msg) => {
    if (msg) {
      console.log('[' + chalk.gray(dateFormat(new Date(), 'HH:MM:ss')) + '] ' + msg)
    }
  }
}
