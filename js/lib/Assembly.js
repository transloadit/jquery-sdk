var uuid = require('uuid')

function Assembly(opts) {
  this._instance = opts.instance
  this._protocol = opts.protocol
  this._internetConnectionChecker = opts.internetConnectionChecker
  this._wait = opts.wait

  this._onStart = opts.onStart || function() {}
  this._onExecuting = opts.onExecuting || function() {}
  this._onSuccess = opts.onSuccess || function() {}
  this._onCancel = opts.onCancel || function() {}
  this._onError = opts.onError || function() {}
  this._onUpload = opts.onUpload || function() {}
  this._onResult = opts.onResult || function() {}

  this._uploads = []
  this._results = {}
  this._uploadFileIds = []
  this._resultFileIds = []

  this._id = uuid.v4().replace(/\-/g, "")
  this._url = this._protocol + this._instance + '/assemblies/' + this._id

  this._pollInterval = opts.pollInterval,
  this._pollTimeout = opts.pollTimeout,
  this._poll404Retries = opts.poll404Retries,
  this._pollConnectionRetries = opts.pollConnectionRetries
  this._pollStarted = null
  this._pollRetries = 0
  this._pollTimer = null

  this._started = false
  this._pollingDisabled = false
}

Assembly.prototype.stopStatusFetching = function () {
  this._pollingDisabled = true
  clearTimeout(this._pollTimer)
}

Assembly.prototype.fetchStatus = function (query, cb) {
  this._poll(query, cb)
}

Assembly.prototype.cancel = function (cb) {
  cb = cb || function() {}

  oldVal = this._pollingDisabled
  this._pollingDisabled = false

  this._poll('?method=delete', function () {
    self._pollingDisabled = oldVal
    cb()
  })
}

Assembly.prototype._poll = function (query, cb) {
  if (this._pollingDisabled) {
    return
  }

  query = query || null
  cb = cb || function() {}

  var instance = 'status-' + this._instance
  var url = this._url

  if (query) {
    url += query
  }

  this._pollStarted = +new Date()

  var self = this

  $.jsonp({
    url: url,
    timeout: self._pollTimeout,
    callbackParameter: 'callback',
    success: function (assembly) {
      if (self._pollingDisabled) {
        return cb()
      }

      var continuePolling = self._handleSuccessfulPoll(assembly)
      if (continuePolling) {
        self._pollTimer = setTimeout(function () {
          self._poll()
        }, self._pollTimeout)
      }
      cb()
    },
    error: function (xhr, status, jsonpErr) {
      if (self._pollingDisabled) {
        return cb()
      }

      var continuePolling = true
      // If this is a server problem and not a client connection problem, check if we should
      // continue polling or if we should abort.
      if (self._internetConnectionChecker.isOnline()) {
        continuePolling = self._handleErroneousPoll(url, xhr, status, jsonpErr)
      }

      if (continuePolling) {
        setTimeout(function () {
          self._poll()
        }, self._pollTimeout)
      }

      cb()
    }
  })
}

Assembly.prototype._handleSuccessfulPoll = function (assembly) {
  this._assemblyResult = assembly

  if (assembly.error === 'ASSEMBLY_NOT_FOUND') {
    this._pollRetries++

    if (this._pollRetries > this._poll404Retries) {
      this._onError(assembly)
      return false
    }
    return true
  }

  if (assembly.error || assembly.ok === 'REQUEST_ABORTED') {
    if (assembly.ok === 'REQUEST_ABORTED') {
      assembly.error = 'REQUEST_ABORTED';
      assembly.msg   = 'Your internet connection is flaky and was offline for at least a moment. Please try again.';
    }

    this._onError(assembly)
    return false
  }

  if (!this._started && assembly.bytes_expected > 0) {
    this._started = true
    this._onStart(assembly)
  }

  this._pollRetries = 0

  var isExecuting = assembly.ok === 'ASSEMBLY_EXECUTING'
  var isCanceled = assembly.ok === 'ASSEMBLY_CANCELED'
  var isComplete = assembly.ok === 'ASSEMBLY_COMPLETED'

  this._mergeUploads(assembly)
  this._mergeResults(assembly)

  if (isCanceled) {
    this._pollingDisabled = true
    this._onCancel(assembly)
    return false
  }

  if (isComplete || (!this._wait && isExecuting)) {
    this._pollingDisabled = true
    assembly.uploads = this._uploads
    assembly.results = this._results
    this._onSuccess(assembly)
    return false
  }

  if (isExecuting) {
    this._onExecuting(assembly)
  }
  return true
}

Assembly.prototype._handleErroneousPoll = function (url, xhr, status, jsonpErr) {
  this._pollRetries++
  if (this._pollRetries <= this._pollConnectionRetries) {
    return true
  }

  var reason = 'JSONP status poll request status: ' + status
  reason += ', err: ' + jsonpErr

  var err = {
    error: 'SERVER_CONNECTION_ERROR',
    message: this._i18n.translate('errors.SERVER_CONNECTION_ERROR'),
    reason: reason,
    url: url
  }
  this._onError(err)
  return false
}

Assembly.prototype._mergeUploads = function (assembly) {
  for (var i = 0; i < assembly.uploads.length; i++) {
    var upload = assembly.uploads[i]

    if ($.inArray(upload.id, this._uploadFileIds) === -1) {
      this._onUpload(upload, assembly)
      this._uploads.push(upload)
      this._uploadFileIds.push(upload.id)
    }
  }
}

Assembly.prototype._mergeResults = function (assembly) {
  for (var step in assembly.results) {
    this._results[step] = this._results[step] || []

    for (var j = 0; j < assembly.results[step].length; j++) {
      var result = assembly.results[step][j]
      var resultId = step + '_' + result.id

      if ($.inArray(resultId, this._resultFileIds) === -1) {
        this._onResult(step, result, assembly)
        this._results[step].push(result)
        this._resultFileIds.push(resultId)
      }
    }
  }
}

Assembly.prototype.getRequestTargetUrl = function (withId) {
  var result = this._protocol + this._instance + '/assemblies'

  if (withId) {
    result += '/' + this._id + '?redirect=false'
  }

  return result
}

Assembly.prototype.getInstance = function () {
  return this._instance
}

Assembly.prototype.setId = function (id) {
  this._id = id
}

Assembly.prototype.getId = function () {
  return this._id
}

Assembly.prototype.setUrl = function (url) {
  this._url = url
}

Assembly.prototype.getUrl = function () {
  return this._url
}

module.exports = Assembly
