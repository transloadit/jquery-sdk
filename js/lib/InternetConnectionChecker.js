var isOnline = require('is-online');

function InternetConnectionChecker(opts) {
  this._onDisconnect = opts.onDisconnect || function () {}
  this._onReconnect = opts.onReconnect || function () {}
  this._intervalLength = opts.intervalLength || 3000

  this._interval = null
  this._isOnline = true
}

InternetConnectionChecker.prototype.start = function () {
  if (this._interval) {
    return
  }

  var self = this
  this._interval = setInterval (function() {
    isOnline(function(online) {
      if (self._isOnline && !online) {
        self._onDisconnect()
      }
      if (!self._isOnline && online) {
        self._onReconnect()
      }
      self._isOnline = online
    });
  }, this._intervalLength)
}

InternetConnectionChecker.prototype.isOnline = function () {
  return this._isOnline
}

module.exports = InternetConnectionChecker
