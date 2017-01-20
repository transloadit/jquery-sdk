var uuid = require('uuid')
var io = require('../dep/socket.io.min')

function Assembly(opts) {
  this._instance = opts.instance
  this._service = opts.service
  this._websocketPath = opts.websocketPath
  this._protocol = opts.protocol
  this._internetConnectionChecker = opts.internetConnectionChecker
  this._wait = opts.wait
  this._requireUploadMetaData = opts.requireUploadMetaData

  this._onStart = opts.onStart || function() {}
  this._onExecuting = opts.onExecuting || function() {}
  this._onSuccess = opts.onSuccess || function() {}
  this._onCancel = opts.onCancel || function() {}
  this._onError = opts.onError || function() {}
  this._onUpload = opts.onUpload || function() {}
  this._onResult = opts.onResult || function() {}

  this._i18n = opts.i18n

  this._id = uuid.v4().replace(/\-/g, "")
  this._url = this._protocol + this._instance + '/assemblies/' + this._id

  this._started = false
  this._socket = null
}

Assembly.prototype.init = function (cb) {
  this._createSocket(cb)
}

Assembly.prototype.cancel = function (cb) {
  cb = cb || function() {}
  var self = this

  this._assemblyRequest('?method=delete', function () {
    self.stopStatusFetching()
    self._end()
    cb()
  })
}

Assembly.prototype._fetchStatus = function (query, cb) {
  if (this._ended) {
    return cb()
  }
  this._assemblyRequest(query, cb)
  this._ended = true
}

Assembly.prototype._assemblyRequest = function (query, cb) {
  query = query || null
  cb = cb || function() {}

  var instance = 'status-' + this._instance
  var url = this._url

  if (query) {
    url += query
  }

  var self = this
  $.jsonp({
    url: url,
    timeout: 8000,
    callbackParameter: 'callback',
    success: function (assembly) {
      self._handleSuccessfulPoll(assembly)
      cb()
    },
    error: function (xhr, status, jsonpErr) {
      // If this is a server problem and not a client connection problem, check if we should
      // continue polling or if we should abort.
      if (self._internetConnectionChecker.isOnline()) {
        self._handleErroneousPoll(url, xhr, status, jsonpErr)
      }
      cb()
    }
  })
}

Assembly.prototype._handleSuccessfulPoll = function (assembly) {
  this._assemblyResult = assembly

  if (assembly.error || assembly.ok === 'REQUEST_ABORTED') {
    if (assembly.ok === 'REQUEST_ABORTED') {
      assembly.error = 'REQUEST_ABORTED';
      assembly.msg   = 'Your internet connection is flaky and was offline for at least a moment. Please try again.';
    }

    this._end()
    this._onError(assembly)
    return false
  }

  if (!this._started && assembly.bytes_expected > 0) {
    this._started = true
    this._onStart(assembly)
  }

  var isExecuting = assembly.ok === 'ASSEMBLY_EXECUTING'
  var isCanceled = assembly.ok === 'ASSEMBLY_CANCELED'
  var isComplete = assembly.ok === 'ASSEMBLY_COMPLETED'

  this._end()

  if (isCanceled) {
    this._onCancel(assembly)
  } else {
    // We only call this when uploading is finished and based on our wait parameter and
    // the requireUploadMetaData parameter. Hence, we can safely call onSuccess here.
    this._onSuccess(assembly)
  }

  if (isExecuting) {
    this._onExecuting(assembly)
  }
}

Assembly.prototype._handleErroneousPoll = function (url, xhr, status, jsonpErr) {
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

Assembly.prototype._end = function () {
  if (this._socket) {
    this._socket.close()
  }
  this._socket = null
}

Assembly.prototype._createSocket = function (cb) {
  var socket = io.connect(this._service, {path: this._websocketPath})
  var cbCalled = false
  var self = this

  socket.on("error", function (error) {
    console.log("Websocket Error", error)
    if (!cbCalled) {
      cbCalled = true
      cb(error)
    }
  })

  socket.on("connect", function (event) {
    if (!cbCalled) {
      socket.send("connect_assembly_" + self._id)
      cbCalled = true
      cb()
    }
  })

  socket.on("assembly_uploading_finished", function () {
    if (!self._wait && !self._requireUploadMetaData) {
      self._fetchStatus()
    }
    console.log("upload finished")
  })

  socket.on("assembly_upload_meta_data_extracted", function () {
    if (!self._wait && self._requireUploadMetaData) {
      self._fetchStatus()
    }
    console.log("upload meta data extracted")
  })

  socket.on("assembly_finished", function () {
    if (self._wait) {
      self._fetchStatus()
    }
    console.log("assembly finished")
  })

  socket.on("assembly_upload", function (file) {
    self._onUpload(file)
  })

  socket.on("assembly_result", function (stepName, result) {
    self._onResult(stepName, result)
  })

  socket.on("disconnect", function (event) {
    console.log("Disconnected", event)
    console.log('Disconnected from WebSocket.')
  })
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
