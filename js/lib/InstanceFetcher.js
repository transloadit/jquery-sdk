require('../dep/jquery.jsonp')

function InstanceFetcher(opts) {
  this._service = opts.service
  this._timeout = opts.timeout || 2500
  this._i18n = opts.i18n
  this._internetConnectionChecker = opts.internetConnectionChecker
}

InstanceFetcher.prototype.fetch = function (cb) {
  var self = this
  function attempt () {
    $.jsonp({
      url: self._service,
      timeout: self._timeout,
      callbackParameter: 'callback',
      success: function (result) {
        cb(result.error, result.hostname)
      },
      error: function (xhr, status, jsonpErr) {
        if (!self._internetConnectionChecker.isOnline()) {
          return attempt()
        }

        var reason = 'JSONP assembly_id request status: ' + status
        reason += ', err: ' + jsonpErr

        var err = {
          error: 'SERVER_CONNECTION_ERROR',
          message: self._i18n.translate('errors.SERVER_CONNECTION_ERROR'),
          reason: reason,
          url: url
        }
        cb(err)
      }
    })
  }

  attempt()
}

module.exports = InstanceFetcher
