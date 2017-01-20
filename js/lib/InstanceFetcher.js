require('../dep/jquery.jsonp')

function InstanceFetcher(opts) {
  this._service = opts.service
  this._timeout = opts.timeout || 2500
  this._retries = opts.retries || 3
  this._timeBetweenRetries = opts.timeBetweenRetries || 8000

  this._onError = opts.onError || function() {}
  this._i18n = opts.i18n
}

InstanceFetcher.prototype.fetch = function (cb) {
  var self = this
  var attemptCount = 0

  function _fetch () {
    console.log(">>> fetch from", self._service, self._timeout)
    $.jsonp({
      url: self._service,
      timeout: self._timeout,
      callbackParameter: 'callback',
      success: function (result) {
        cb(result.error, result.hostname, result.websocket_path)
      },
      error: function (xhr, status, jsonpErr) {
        var reason = 'JSONP assembly_id request status: ' + status
        reason += ', err: ' + jsonpErr

        var retriesExhausted = attemptCount >= self._retries

        errMsg = 'errors.SERVER_CONNECTION_ERROR'
        if (retriesExhausted) {
          errMsg = 'errors.SERVER_CONNECTION_ERROR.retries_exhausted'
        }

        var err = {
          error: 'SERVER_CONNECTION_ERROR',
          message: self._i18n.translate(errMsg),
          reason: reason,
          url: self._service
        }

        if (retriesExhausted) {
          self._onError(err)
          return cb(err, true)
        }

        setTimeout(function() {
          attemptCount++
          _fetch()
        }, self._timeBetweenRetries)
      }
    })
  }

  _fetch()
}

module.exports = InstanceFetcher
