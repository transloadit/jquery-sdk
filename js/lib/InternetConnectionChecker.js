class InternetConnectionChecker {
  constructor ({ onDisconnect, onReconnect }) {
    this._onDisconnect = onDisconnect || (() => {})
    this._onReconnect = onReconnect || (() => {})

    this._isOnline = true
  }

  start () {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onlineCheck())
      window.addEventListener('offline', () => this.onlineCheck())
      setTimeout(() => this.onlineCheck(), 3000)
    }
  }

  onlineCheck (cb) {
    const online =
      typeof window.navigator.onLine !== 'undefined'
        ? window.navigator.onLine
        : true

    if (this._isOnline && !online) {
      this._onDisconnect()
    }
    if (!this._isOnline && online) {
      this._onReconnect()
    }
    this._isOnline = online
  }

  isOnline () {
    return this._isOnline
  }
}

module.exports = InternetConnectionChecker
