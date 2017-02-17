const isOnline = require('is-online')

class InternetConnectionChecker {
  constructor ({ onDisconnect, onReconnect, intervalLength }) {
    this._onDisconnect = onDisconnect || (() => {})
    this._onReconnect = onReconnect || (() => {})
    this._intervalLength = intervalLength || 3000

    this._interval = null
    this._isOnline = true
  }

  start () {
    if (this._interval) {
      return
    }

    const self = this
    this._interval = setInterval(
      () => {
        isOnline(online => {
          if (self._isOnline && !online) {
            self._onDisconnect()
          }
          if (!self._isOnline && online) {
            self._onReconnect()
          }
          self._isOnline = online
        })
      },
      this._intervalLength
    )
  }

  isOnline () {
    return this._isOnline
  }

  isCurrentlyOnline (cb) {
    isOnline(cb)
  }
}

module.exports = InternetConnectionChecker
