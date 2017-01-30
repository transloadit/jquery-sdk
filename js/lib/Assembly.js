var uuid = require('uuid')
var io = require('../dep/socket.io.min')

function Assembly(opts) {
  this._instance = opts.instance
  this._service = opts.service
  this._websocketPath = opts.websocketPath
  this._protocol = opts.protocol
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
  this._ended = false
  this._finished = false
  this._socket = null
  this._socketConnected = false
  this._socketReconnectInterval = null

  this._statusFetchRetries = 3
  this._timeBetweenStatusFetchRetries = 8000
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

  console.log(">> fetching", url)
  var self = this
  var attemptCount = 0

  function attempt() {
    $.jsonp({
      url: url,
      timeout: 8000,
      callbackParameter: 'callback',
      success: function (assembly) {
        console.log('Success')
        self._handleSuccessfulPoll(assembly)
        cb()
      },
      error: function (xhr, status, jsonpErr) {
        var retriesExhausted = attemptCount >= self._statusFetchRetries
        var err = self._connectionError(retriesExhausted)
        err.reason = 'Could not fetch assembly status.'
        err.reason += ' Return code: ' + status + ', Error: ' + jsonpErr

        self._onError(err, retriesExhausted)

        if (retriesExhausted) {
          return cb(err, true)
        }

        setTimeout(function() {
          attemptCount++
          attempt()
        }, self._timeBetweenStatusFetchRetries)
      }
    })
  }

  attempt()
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

  console.log('>>> create socket')
  socket.on("error", function (error) {
    console.log("Websocket Error", error)
    if (!cbCalled) {
      cbCalled = true
      cb(error)
    }
  })

  socket.on("connect", function (event) {
    self._socketConnected = true

    console.log(">>> CONNECTED")
    if (self._socketReconnectInterval) {
      clearInterval(self._socketReconnectInterval)
      self._socketReconnectInterval = null
    }

    if (!cbCalled) {
      console.log(">>> SEND CONNECT")
      socket.emit("assembly_connect", {id: self._id})
      cbCalled = true
      cb()
    }
  })

  socket.on("assembly_uploading_finished", function () {
    console.log("uploading finished")
    if (!self._wait && !self._requireUploadMetaData) {
      self._fetchStatus()
    }
  })

  socket.on("assembly_upload_meta_data_extracted", function () {
    console.log("upload meta data extracted")
    if (!self._wait && self._requireUploadMetaData) {
      self._fetchStatus()
    }
  })

  socket.on("assembly_finished", function () {
    console.log("assembly finished")
    self._finished = true
    if (self._wait) {
      self._fetchStatus()
    }
  })

  socket.on("assembly_upload_finished", function (file) {
    console.log("assembly_upload_finished")
    self._onUpload(file)
  })

  socket.on("assembly_result", function (stepName, result) {
    console.log("assembly_result")
    self._onResult(stepName, result)
  })

  socket.on("disconnect", function (event) {
    // If the assembly is complete, or it is complete in our eyes based on the wait and
    // requireUploadMetaData parameters, then we do not mind the socket disconnection.
    // The final status fetching has its own connection error handling.
    console.log("Disconnected", event)
    if (self._finished || self._ended) {
      console.log("Do not care about disconnect")
      return
    }

    console.log("Caring about disconnect")

    var err = self._connectionError(true)
    err.reason = 'The Websocket disconnected.'
    self._onError(err)

    socket.close()
    self._socketReconnectInterval = setInterval(function() {
      console.log('>>> try to create socket')
      self._createSocket()
    }, 3000)
  })
}

Assembly.prototype.getRequestTargetUrl = function (withId) {
  var result = this._protocol + this._instance + '/assemblies'

  if (withId) {
    result += '/' + this._id + '?redirect=false'
  }

  return result
}

Assembly.prototype._connectionError = function (retriesExhausted) {
  errMsg = 'errors.SERVER_CONNECTION_ERROR'
  if (retriesExhausted) {
    errMsg = 'errors.SERVER_CONNECTION_ERROR.retries_exhausted'
  }

  var err = {
    error: 'SERVER_CONNECTION_ERROR',
    message: this._i18n.translate(errMsg),
    url: this._service
  }

  return err
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
