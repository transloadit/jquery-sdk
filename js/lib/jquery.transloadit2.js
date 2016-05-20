/*global tus:false*/

/** @license jquery.transloadit2.js: Copyright (c) 2013 Transloadit Ltd | MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Fork this on Github: http://github.com/transloadit/jquery-sdk
 *
 * Transloadit servers allow browsers to cache jquery.transloadit2.js for 1 hour.
 * keep this in mind when rolling out fixes.
 */
require('../dep/json2')
require('../dep/jquery.jsonp')

var Modal = require('./Modal')
var DragDrop = require('./DragDrop')
var FilePreview = require('./FilePreview')
var I18n = require('./I18n')
var uuid = require('uuid')
var isOnline = require('is-online');
var helpers = require('../dep/helpers')
var tus = require('../dep/tus')

!(function ($) {
  var PROTOCOL = (document.location.protocol === 'https:') ? 'https://' : 'http://'

  var DEFAULT_SERVICE = PROTOCOL + 'api2.transloadit.com/'

  var I18nDict = {
    en: {
      'errors.SERVER_CONNECTION_ERROR': 'There was a problem connecting to the upload server. Please reload your browser window and try again.',
      'errors.ASSEMBLY_NOT_FOUND': 'There was a server problem finding the proper upload. Please reload your browser window and try again.',
      'errors.INTERNET_CONNECTION_ERROR_UPLOAD_IN_PROGRESS': 'Your internet connection seems to be offline. We will automatically retry the upload until the connection works again. Please leave the browser window open.',
      'errors.INTERNET_CONNECTION_ERROR_UPLOAD_NOT_IN_PROGRESS': 'Your internet connection seems to be offline. Please leave the browser window open, so that we can retry fetching the status of your upload.',
      'errors.MAX_FILES_EXCEEDED': 'Please select at most %s files.',
      'errors.unknown': 'There was an internal error.',
      'errors.tryAgain': 'Please try your upload again.',
      'errors.troubleshootDetails': 'If you would like our help to troubleshoot this, ' +
          'please email us this information:',
      cancel: 'Cancel',
      details: 'Details',
      startingUpload: 'Starting upload ...',
      processingFiles: 'Upload done, now processing files ...',
      uploadProgress: '%s / %s MB at %s kB/s | %s left'
    },
    ja: {
      'errors.SERVER_CONNECTION_ERROR': 'サーバー接続に問題があります',
      'errors.unknown': '通信環境に問題があります',
      'errors.tryAgain': 'しばらくしてから再度投稿してください',
      'errors.troubleshootDetails': '解決できない場合は、こちらにお問い合わせください ' +
          '下記の情報をメールでお送りください:',
      cancel: 'キャンセル',
      details: '詳細',
      startingUpload: '投稿中 ...',
      processingFiles: '接続中',
      uploadProgress: '%s MB / %s MB (%s kB / 秒)'
    }
  }

  var OPTIONS = {
    service: DEFAULT_SERVICE,
    assets: PROTOCOL + 'assets.transloadit.com/',
    beforeStart: function () { return true },
    onFileSelect: function () {},
    onStart: function () {},
    onProgress: function () {},
    onUpload: function () {},
    onResult: function () {},
    onCancel: function () {},
    onError: function () {},
    onSuccess: function () {},
    onDisconnect: function() {},
    onReconnect: function() {},
    resumable: false,
    interval: 2500,
    pollTimeout: 8000,
    poll404Retries: 15,
    pollConnectionRetries: 5,
    wait: false,
    processZeroFiles: true,
    triggerUploadOnFileSelection: false,
    autoSubmit: true,
    modal: true,
    exclude: '',
    fields: false,
    params: null,
    signature: null,
    region: 'us-east-1',
    locale: 'en',
    maxNumberOfUploadedFiles: -1,
    debug: true
  }

  var CSS_LOADED = false

  $.fn.transloadit = function () {
    var args = Array.prototype.slice.call(arguments)
    var method
    var uploader
    var r

    if (this.length === 0) {
      return
    }

    if (this.length > 1) {
      this.each(function () {
        $.fn.transloadit.apply($(this), args)
      })
      return
    }

    if (args.length === 1 && typeof args[0] === 'object' || args[0] === undefined) {
      args.unshift('init')
    }

    method = args.shift()
    if (method === 'init') {
      uploader = new Uploader()
      args.unshift(this)
      this.data('transloadit.uploader', uploader)
    } else {
      uploader = this.data('transloadit.uploader')
    }

    if (!uploader) {
      throw new Error('Element is not initialized for transloadit!')
    }

    r = uploader[method].apply(uploader, args)
    return (r === undefined) ? this : r
  }

  $.fn.transloadit.i18n = I18nDict

  function Uploader () {
    this._assemblyId = null

    this._instance = null
    this._timer = null
    this._options = {}
    this._uploads = []
    this._results = {}
    this._ended = null
    this._pollStarted = null
    this._pollRetries = 0
    this._started = false
    this._assembly = null
    this._params = null
    this._fileCount = 0

    this._$params = null
    this._$form = null
    this._$files = null

    this._resumableUploads = []

    this._uploadFileIds = []
    this._resultFileIds = []
    this._xhr = null
    this._dragDropObjects = []
    this._previewAreaObjects = []
    this._formData = null
    this._files = {}

    this._connectionCheckerInterval = null
    this._isOnline = true
  }

  Uploader.prototype.init = function ($form, options) {
    var self = this
    this.options($.extend({}, OPTIONS, options || {}))

    this._initI18n()
    this._initModal()
    this._initInternetConnectionChecker()

    this._$form = $form
    this._initDragAndDrop()
    this._initFilePreview()

    this._$form.bind('submit.transloadit', function () {
      self._detectFileInputs()
      self.validate()

      if (!self._options['processZeroFiles'] && self._$files.length === 0) {
        if (self._options.beforeStart()) {
          self.submitForm()
        }
      } else {
        if (self._options.beforeStart()) {
          self.start()
        }
      }

      return false
    })

    if (this._options.triggerUploadOnFileSelection) {
      this._$form.on('change', 'input[type="file"]', function () {
        self._$form.trigger('submit.transloadit')
      })
    }

    this._$form.on('change', 'input[type="file"]', function () {
      self._options.onFileSelect($(this).val(), $(this))
    })

    this.includeCss()
  }

  Uploader.prototype.start = function () {
    this._xhr = null
    this._started = false
    this._ended = false
    this._pollRetries = 0
    this._fileCount = 0
    this._uploads = []
    this._resumableUploads = []
    this._uploadFileIds = []
    this._resultFileIds = []
    this._results = {}

    this._modal.reset()

    var self = this
    var cb = function () {
      setTimeout(function () {
        self._poll()
      }, 300)
    }


    this._getInstance(function (err) {
      if (err) {
        return
      }

      self._countAddedFiles()
      if (!self._checkFileCountExceeded()) {
        return
      }

      if (self._options.resumable) {
        self._startWithResumabilitySupport(cb)
      } else {
        self._startWithXhr(cb)
      }
    })
  }

  Uploader.prototype._getInstance = function (cb) {
    var self = this

    this._instance = null
    var url = this._options['service']
    var attempts = 0

    function attempt () {
      $.jsonp({
        url: url,
        timeout: self._options.pollTimeout,
        callbackParameter: 'callback',
        success: function (result) {
          if (result.error) {
            return self._errorOut(result)
          }

          self._instance = result.hostname
          cb()
        },
        error: function (xhr, status, jsonpErr) {
          if (!self._isOnline) {
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
          self._errorOut(err)
          cb(err)
        }
      })
    }

    attempt()

    if (this._options.modal) {
      this._modal.show()
    }
  }

  Uploader.prototype._startWithXhr = function (cb) {
    var self = this
    this._assemblyId = uuid.v4().replace(/\-/g, "")
    this._formData = this._prepareFormData()

    this._appendFilteredFormFields(true)
    this._appendCustomFormData()

    this._xhr = new XMLHttpRequest()

    this._xhr.addEventListener("error", function(err) {
      self._xhr = null
    })
    this._xhr.addEventListener("abort", function(err) {
      self._xhr = null
    })
    this._xhr.addEventListener("timeout", function(err) {
      self._xhr = null
    })
    this._xhr.addEventListener("load", function() {
      self._xhr = null
    })

    this._xhr.upload.addEventListener("progress", function progressFunction(evt){
      if (!evt.lengthComputable) {
        return
      }

      self._renderProgress(evt.loaded, evt.total)
      self._options.onProgress(evt.loaded, evt.total, self._assembly)
    })

    var url = this._getAssemblyRequestTargetUrl(this._assemblyId)
    this._xhr.open('POST', url)
    this._xhr.send(this._formData)
    cb()
  }

  Uploader.prototype._startWithResumabilitySupport = function (cb) {
    var self = this
    this._formData = this._prepareFormData()
    this._formData.append('tus_num_expected_upload_files', this._fileCount)

    this._appendFilteredFormFields()
    this._appendCustomFormData()

    // We need this to control retries/resumes
    this._xhr = true

    function proceed () {
      // add uploads from file input fields
      self._$files.each(function () {
        var nameAttr = $(this).attr('name')
        if (!this.files) {
          return
        }

        for (var i = 0; i < this.files.length; i++) {
          var file = this.files[i]
          var upload = self._addResumableUpload(nameAttr, file)
          upload.start()
        }
      })

      // adding uploads from drag/dropped files
      for (var name in self._files) {
        if (self._files[name].length === 0) {
          continue
        }

        for (var i = 0; i < self._files[name].length; i++) {
          var file = self._files[name][i]
          var upload = self._addResumableUpload(name, file)
          upload.start()
        }
      }
    }

    var f = new XMLHttpRequest()
    var url = this._getAssemblyRequestTargetUrl()
    f.open('POST', url)
    f.onreadystatechange = function () {
      if (f.readyState === 4 && f.status === 200) {
        var resp = JSON.parse(f.responseText)
        self._assemblyId = resp.id
        proceed()
        cb()
      }
    }
    f.send(this._formData)
  }

  Uploader.prototype._addResumableUpload = function (nameAttr, file) {
    var self = this
    var endpoint = PROTOCOL + this._instance + '/resumable/'

    var upload = new tus.Upload(file, {
      endpoint: endpoint,
      resume: true,
      metadata: {
        fieldname: nameAttr,
        filename: file.name,
        assembly_id: this._assemblyId
      },
      onError: function (error) {
        self._xhr = false
      },
      onSuccess: function() {
        self._xhr = false
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        self._renderProgress(bytesUploaded, bytesTotal)
        self._options.onProgress(bytesUploaded, bytesTotal, self._assembly)
      }
    })
    this._resumableUploads.push(upload)

    return upload
  }

  Uploader.prototype._prepareFormData = function () {
    var assemblyParams = this._options.params
    if (this._$params) {
      assemblyParams = this._$params.val()
    }
    if (typeof assemblyParams !== 'string') {
      assemblyParams = JSON.stringify(assemblyParams)
    }

    var result = {}
    if (this._options.formData instanceof FormData) {
      result = this._options.formData
    } else {
      result = new FormData()
    }

    result.append('params', assemblyParams)
    if (this._options.signature) {
      result.append('signature', this._options.signature)
    }

    return result
  }

  Uploader.prototype._appendDroppedFiles = function () {
    for (var key in this._files) {
      for (var i = 0; i < this._files[key].length; i++) {
        this._formData.append(key, this._files[key][i])
        this._fileCount++
      }
    }
  }

  Uploader.prototype._countAddedFiles = function () {
    var self = this
    this._fileCount = 0

    // file input fields
    this._$files.each(function () {
      var name = $(this).attr('name')
      if (!name) {
        return
      }
      self._fileCount += this.files.length
    })

    // drag/dropped files
    for (var key in this._files) {
      for (var i = 0; i < this._files[key].length; i++) {
        this._fileCount++
      }
    }
  }


  Uploader.prototype._appendFilteredFormFields = function (allowFiles) {
    var $fields = this._getFilteredFormFields(allowFiles)
    var self = this

    $fields.each(function () {
      var name = $(this).attr('name')
      if (!name) {
        return
      }

      if (allowFiles && this.files) {
        for (var i = 0; i < this.files.length; i++) {
          self._formData.append(name, this.files[i])
        }
      }
    })

    if (allowFiles) {
      this._appendDroppedFiles()
    }
  }

  Uploader.prototype._checkFileCountExceeded = function () {
    if (this._options.maxNumberOfUploadedFiles == -1) {
      return true
    }

    if (this._fileCount > this._options.maxNumberOfUploadedFiles) {
      var max = this._options.maxNumberOfUploadedFiles
      var err = {
        error: 'MAX_FILES_EXCEEDED',
        message: this._i18n.translate('errors.MAX_FILES_EXCEEDED', max)
      }
      this._errorOut(err)
      return false
    }

    return true
  }

  Uploader.prototype._appendCustomFormData = function () {
    if (!this._options.formData) {
      return
    }

    for (var i = 0; i < this._options.formData.length; i++) {
      var tupel = this._options.formData[i]
      this._formData.append(tupel[0], tupel[1], tupel[2])
    }
  }

  Uploader.prototype._getAssemblyRequestTargetUrl = function (assemblyId) {
    var result = PROTOCOL + this._instance + '/assemblies'

    if (assemblyId) {
        result += '/' + assemblyId + '?redirect=false'
    }

    return result
  }

  Uploader.prototype._getFilteredFormFields = function (allowFiles) {
    var fieldsFilter = '[name=params], [name=signature]'
    if (this._options.fields === true) {
      fieldsFilter = '*'
    } else if (typeof this._options.fields === 'string') {
      fieldsFilter += ', ' + this._options.fields
    } else {
      // fields is false, but let's attach file fields, otherwise we will not have uploads. :)
      if (allowFiles) {
        fieldsFilter += ", [type=file]"
      }
    }

    // Filter out submit elements right away as they will cause funny behavior
    // in the shadow form.
    var $fields = this._$form.find(':input[type!=submit]')
    if (!allowFiles) {
      $fields = $fields.filter('[type!=file]')
    }

    return $fields.filter(fieldsFilter)
  }

  Uploader.prototype.stop = function () {
    this._ended = true
  }

  Uploader.prototype.destroy = function () {
    this.stop()
    this._$form.data('transloadit.uploader', null)
    this._$form.unbind('submit.transloadit')
  }

  Uploader.prototype.cancel = function () {
    // @todo this has still a race condition if a new upload is started
    // while the cancel request is still being executed. Shouldn't happen
    // in real life, but needs fixing.
    this._formData = this._prepareFormData()

    // decide if we should emoty this._files here, probably not

    this._abortUpload()

    if (!this._ended) {
      if (this._$params) {
        this._$params.prependTo(this._$form)
      }
      clearTimeout(this._timer)
      this._poll('?method=delete')
    }

    if (this._options.modal) {
      this._modal.hide()
    }
  }

  Uploader.prototype.submitForm = function () {
    // prevent that files are uploaded to the final destination
    // after all that is what we use this plugin for :)
    if (this._$form.attr('enctype') === 'multipart/form-data') {
      this._$form.removeAttr('enctype')
    }

    if (this._assembly !== null) {
      $('<textarea/>')
        .attr('name', 'transloadit')
        .text(JSON.stringify(this._assembly))
        .prependTo(this._$form).hide()
    }

    if (this._options.autoSubmit) {
      this._$form.unbind('submit.transloadit').submit()
    }
  }

  Uploader.prototype.validate = function () {
    if (!this._options.params) {
      var $params = this._$form.find('input[name=params]')
      if (!$params.length) {
        alert('Could not find input[name=params] in your form.')
        return
      }

      this._$params = $params
      try {
        this._params = JSON.parse($params.val())
      } catch (e) {
        alert('Error: input[name=params] seems to contain invalid JSON.')
        return
      }
    } else {
      this._params = this._options.params
    }

    var fileInputFieldsAreGood = true
    this._$files.each(function() {
      var name = $(this).attr('name')
      if (!name) {
        fileInputFieldsAreGood = false
      }
    })
    if (!fileInputFieldsAreGood) {
      alert('Error: One of your file input fields does not contain a name attribute!')
    }

    if (this._params.redirect_url) {
      this._$form.attr('action', this._params.redirect_url)
    } else if (this._options.autoSubmit && (this._$form.attr('action') === this._options.service + 'assemblies')) {
      alert('Error: input[name=params] does not include a redirect_url')
      return
    }
  }

  Uploader.prototype._poll = function (query) {
    if (this._ended) {
      return
    }

    var self = this
    var instance = 'status-' + this._instance
    var url = PROTOCOL + instance + '/assemblies/' + this._assemblyId

    if (query) {
      url += query
    }

    this._pollStarted = +new Date()

    $.jsonp({
      url: url,
      timeout: self._options.pollTimeout,
      callbackParameter: 'callback',
      success: function (assembly) {
        if (self._ended) {
          return
        }

        var continuePolling = self._handleSuccessfulPoll(assembly)
        if (continuePolling) {
          var timeout = self._calcPollTimeout()
          self._timer = setTimeout(function () {
            self._poll()
          }, timeout)
        }
      },
      error: function (xhr, status, jsonpErr) {
        if (self._ended) {
          return
        }

        var continuePolling = true
        // If this is a server problem and not a client connection problem, check if we should
        // continue polling or if we should abort.
        if (self._isOnline) {
          continuePolling = self._handleErroneousPoll(url, xhr, status, jsonpErr)
        }

        if (continuePolling) {
          var timeout = self._calcPollTimeout()
          setTimeout(function () {
            self._poll()
          }, timeout)
        }
      }
    })
  }

  Uploader.prototype._handleSuccessfulPoll = function (assembly) {
    this._assembly = assembly

    if (assembly.error === 'ASSEMBLY_NOT_FOUND') {
      this._pollRetries++

      if (this._pollRetries > this._options.poll404Retries) {
        this._errorOut(assembly)
        return false
      }
      return true
    }

    if (assembly.error) {
      this._errorOut(assembly)
      return false
    }

    if (!this._started && assembly.bytes_expected > 0) {
      this._started = true
      this._options.onStart(assembly)
    }

    this._pollRetries = 0

    var isExecuting = assembly.ok === 'ASSEMBLY_EXECUTING'
    var isCanceled = assembly.ok === 'ASSEMBLY_CANCELED'
    var isComplete = assembly.ok === 'ASSEMBLY_COMPLETED'

    this._mergeUploads(assembly)
    this._mergeResults(assembly)

    if (isCanceled) {
      this._ended = true
      this._options.onCancel(assembly)
      return false
    }

    if (isComplete || (!this._options['wait'] && isExecuting)) {
      this._ended = true
      assembly.uploads = this._uploads
      assembly.results = this._results
      this._options.onSuccess(assembly)

      if (this._options.modal) {
        this.cancel()
      }
      this.submitForm()
      return false
    }

    // If the assembly is executing meaning all uploads are done, we will not get more progress
    // events from XHR. But if there was a connection interruption in the meantime, we want to
    // make sure all components (like the modal) now know that the error is gone.
    if (isExecuting) {
      this._renderProgress()
    }
    return true
  }

  Uploader.prototype._handleErroneousPoll = function (url, xhr, status, jsonpErr) {
    this._pollRetries++
    if (this._pollRetries <= this._options.pollConnectionRetries) {
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
    this._errorOut(err)
    return false
  }

  Uploader.prototype._renderError = function (err) {
    if (!this._options.modal) {
      return
    }

    if (!this._options.debug) {
      return this.cancel()
    }

    err.assemblyId = this._assemblyId
    err.instance = this._instance
    this._modal.renderError(err)
  }

  Uploader.prototype._detectFileInputs = function () {
    var $files = this._$form
      .find('input[type=file]')
      .not(this._options.exclude)

    if (!this._options['processZeroFiles']) {
      $files = $files.filter(function () {
        return this.value !== ''
      })
    }
    this._$files = $files
  }

  Uploader.prototype._renderProgress = function (received, expected) {
    if (!this._options.modal) {
      return
    }
    this._modal.renderProgress(received, expected)
  }

  Uploader.prototype.includeCss = function () {
    if (CSS_LOADED || !this._options.modal) {
      return
    }

    CSS_LOADED = true
    $('<link rel="stylesheet" type="text/css" href="' + this._options.assets + 'css/transloadit2-latest.css" />')
      .appendTo('head')
  }

  Uploader.prototype._calcPollTimeout = function () {
    var ping = this._pollStarted - +new Date()
    return ping < this._options.interval ? this._options.interval : ping
  }

  Uploader.prototype._mergeUploads = function (assembly) {
    for (var i = 0; i < assembly.uploads.length; i++) {
      var upload = assembly.uploads[i]

      if ($.inArray(upload.id, this._uploadFileIds) === -1) {
        this._options.onUpload(upload, assembly)
        this._uploads.push(upload)
        this._uploadFileIds.push(upload.id)
      }
    }
  }

  Uploader.prototype._mergeResults = function (assembly) {
    for (var step in assembly.results) {
      this._results[step] = this._results[step] || []

      for (var j = 0; j < assembly.results[step].length; j++) {
        var result = assembly.results[step][j]
        var resultId = step + '_' + result.id

        if ($.inArray(resultId, this._resultFileIds) === -1) {
          this._options.onResult(step, result, assembly)
          this._results[step].push(result)
          this._resultFileIds.push(resultId)
        }
      }
    }
  }

  Uploader.prototype._errorOut = function (err) {
    if (!err.message) {
      err.message = this._i18n.translate('errors.' + err.error)
    }

    this._ended = true
    this._renderError(err)
    this._options.onError(err)
    this._abortUpload()
  }

  Uploader.prototype._abortUpload = function () {
    if (this._xhr && typeof this._xhr.abort === "function") {
      this._xhr.abort()
    }
  }

  Uploader.prototype._onDisconnect = function () {
    var errorType = 'INTERNET_CONNECTION_ERROR_UPLOAD_IN_PROGRESS'

    if (!this._xhr) {
      errorType = 'INTERNET_CONNECTION_ERROR_UPLOAD_NOT_IN_PROGRESS'
    }

    var err = {
      error: errorType,
      message: this._i18n.translate('errors.' + errorType)
    }
    this._renderError(err)
  }

  Uploader.prototype._onReconnect = function () {
    // If no upload is in progress anyway, then we do not need to do anything here.
    // Polling for the assembly status will auto-continue without us doing anything here.
    if (!this._xhr) {
      return
    }

    if (!this._options.resumable) {
      // Note: Google Chrome can resume xhr requests. However, we ignore this here, because
      // we have our own resume flag with tus support.
      this._abortUpload()

      // If we have an upload in progress when we get the disconnect, retry it.
      // If we do not have an upload in progress, we keep polling automatically for the status.
      // No need to take further action here for this case.
      return this.start()
    }

    // Resume all our uploads in the resumable case. :)
    for (var i = 0; i < this._resumableUploads.length; i++) {
      var upload = this._resumableUploads[i]
      upload.resume()
    }
  }

  Uploader.prototype._initI18n = function () {
    this._i18n = new I18n(I18nDict, this._locale)
  }

  Uploader.prototype._initModal = function () {
    var self = this
    this._modal = new Modal({
      onClose: function() {
        self.cancel()
      },
      i18n: this._i18n
    })
  }

  Uploader.prototype._initDragAndDrop = function () {
    var $dropAreas = this._$form.find('.transloadit-drop-area')
    if ($dropAreas.length === 0) {
      return
    }

    var self = this
    var i = 0
    $dropAreas.each(function () {
      var name = $(this).data('name') || 'files'

      self._dragDropObjects[i] = new DragDrop({
        onFileAdd: function (file) {
          if (self._files[name]) {
            self._files[name].push(file)
          } else {
            self._files[name] = [file]
          }

          if (self._options.triggerUploadOnFileSelection) {
            self._$form.trigger('submit.transloadit')
          }
          self._options.onFileSelect(file, $(this))
          self._addFileToPreviewAreas(file)
        },
        $el: $(this)
      })
      i++
    })
  }

  Uploader.prototype._initFilePreview = function () {
    var $previewAreas = this._$form.find('.transloadit-file-preview-area')
    if ($previewAreas.length === 0) {
      return
    }

    var self = this
    var i = 0
    $previewAreas.each(function () {
      var name = $(this).data('name') || 'files'

      self._previewAreaObjects[i] = new FilePreview({
        onFileRemove: function (file) {
          self._removeFileFromFormData(file)
          self._removeFileFromPreviewAreas(file)
        },
        $el: $(this)
      })
      i++
    })
  }

  Uploader.prototype._addFileToPreviewAreas = function (file) {
    for (var i = 0; i < this._previewAreaObjects.length; i++) {
      this._previewAreaObjects[i].addFile(file)
    }
  }

  Uploader.prototype._removeFileFromPreviewAreas = function (file) {
    for (var i = 0; i < this._previewAreaObjects.length; i++) {
      this._previewAreaObjects[i].removeFile(file)
    }
  }

  Uploader.prototype._removeFileFromFormData = function (file) {
    for (var i = 0; i < this._previewAreaObjects.length; i++) {
      this._previewAreaObjects[i].removeFile(file)
    }

    for (var key in this._files) {
      for (var i = 0; i < this._files[key].length; i++) {
        var myFile = this._files[key][i]
        if (myFile.size !== file.size || myFile.name !== file.name) {
          continue
        }

        if (myFile.lastModified !== file.lastModified) {
          continue
        }

        this._files[key].splice(i, 1);
      }
    }
  }

  Uploader.prototype._initInternetConnectionChecker = function () {
    if (this._connectionCheckerInterval) {
      return
    }

    var self = this
    this._connectionCheckerInterval = setInterval (function() {
      isOnline(function(online) {
        if (self._isOnline && !online) {
          self._onDisconnect()
          self._options.onDisconnect()
        }
        if (!self._isOnline && online) {
          self._onReconnect()
          self._options.onReconnect()
        }
        self._isOnline = online
      });
    }, 3000)
  }

  Uploader.prototype.options = function (options) {
    if (arguments.length === 0) {
      return this._options
    }

    $.extend(this._options, options)
  }

  Uploader.prototype.option = function (key, val) {
    if (arguments.length === 1) {
      return this._options[key]
    }

    this._options[key] = val
  }
}(window.jQuery))
