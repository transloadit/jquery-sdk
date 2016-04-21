/*global tus:false*/

/** @license jquery.transloadit2.js: Copyright (c) 2013 Transloadit Ltd | MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Fork this on Github: http://github.com/transloadit/jquery-sdk
 *
 * Transloadit servers allow browsers to cache jquery.transloadit2.js for 1 hour.
 * keep this in mind when rolling out fixes.
 */

!(function ($) {
  var PROTOCOL = (document.location.protocol === 'https:') ? 'https://' : 'http://'

  var DEFAULT_SERVICE = PROTOCOL + 'api2.transloadit.com/'

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
    resumable: false,
    resumableEndpointPath: '/resumable/',
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
    debug: true,
    locale: 'en'
  }

  var I18N = {
    en: {
      'errors.BORED_INSTANCE_ERROR': 'Could not find a bored instance.',
      'errors.CONNECTION_ERROR': 'There was a problem connecting to the upload server',
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
      'errors.BORED_INSTANCE_ERROR': 'サーバー接続に問題があります',
      'errors.CONNECTION_ERROR': 'サーバー接続に問題があります',
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
  var CSS_LOADED = false

  function sprintf (str, args) {
    args = args || []
    return str.replace(/(%[s])/g, function (m, i, s) {
      var arg = args.shift()
      if (!arg && arg !== 0) {
        return ''
      }
      return arg + ''
    })
  }

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

  $.fn.transloadit.i18n = I18N

  function Uploader () {
    this.assemblyId = null

    this.instance = null
    this.documentTitle = null
    this.timer = null
    this._options = {}
    this.uploads = []
    this.results = {}
    this.ended = null
    this.pollStarted = null
    this.pollRetries = 0
    this.started = false
    this.assembly = null
    this.params = null

    this._bytesReceivedBefore = 0

    this.$params = null
    this.$form = null
    this.$files = null
    this.$modal = null

    this._animatedTo100 = false
    this._lastProgressEventOn = 0
    this._assemblyComplete = false
    this._uploadFileIds = []
    this._resultFileIds = []
  }

  Uploader.prototype.init = function ($form, options) {
    this.$form = $form
    this.options($.extend({}, OPTIONS, options || {}))

    var self = this
    $form.bind('submit.transloadit', function () {
      self.validate()
      self.detectFileInputs()

      if (!self._options['processZeroFiles'] && self.$files.length === 0) {
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

    if (this._options['triggerUploadOnFileSelection']) {
      $form.on('change', 'input[type="file"]', function () {
        $form.trigger('submit.transloadit')
      })
    }

    $form.on('change', 'input[type="file"]', function () {
      self._options.onFileSelect($(this).val(), $(this))
    })

    this.includeCss()
  }

  Uploader.prototype._getInstance = function (cb) {
    var self = this

    this.instance = null
    var url = this._options['service']
    var attempts = 0

    function attempt () {
      $.jsonp({
        url: url,
        timeout: self._options.pollTimeout,
        callbackParameter: 'callback',
        success: function (result) {
          if (result.error) {
            var err = result
            self.ended = true
            self.renderError(err)
            return self._options.onError(err)
          }

          self.instance = result.hostname
          cb()
        },
        error: function (xhr, status, jsonpErr) {
          attempts++

          if (attempts < self._options.pollConnectionRetries) {
            return attempt()
          }

          self.ended = true

          var reason = 'JSONP assembly_id request status: ' + status
          reason += ', err: ' + jsonpErr

          var err = {
            error: 'CONNECTION_ERROR',
            message: self.i18n('errors.CONNECTION_ERROR'),
            reason: reason,
            url: url
          }
          self.renderError(err)
          self._options.onError(err)
          cb(err)
        }
      })
    }

    attempt()

    if (this._options.modal) {
      this.showModal()
    }
  }

  Uploader.prototype.start = function () {
    this.started = false
    this.ended = false
    this._bytesReceivedBefore = 0
    this.pollRetries = 0
    this.uploads = []
    this._animatedTo100 = false
    this._assemblyComplete = false
    this._uploadFileIds = []
    this._resultFileIds = []
    this.results = {}

    var self = this
    var cb = function () {
      setTimeout(function () {
        self._poll()
      }, 300)
    }

    if (this._options.resumable) {
      return this._startWithResumabilitySupport(cb)
    }
    this._getInstance(function (err) {
      if (!err) {
        self._startWithXhr(cb)
      }
    })
  }

  Uploader.prototype._startWithXhr = function (cb) {
    this.assemblyId = window.transloadit.uuid()

    var self = this
    var formData = this._prepareFormData()
    this._appendFilteredFormFields(formData, true)
    this._appendCustomFormData(formData)

    var url = this._getAssemblyRequestTargetUrl()
    var f = new XMLHttpRequest()
    // f.upload.addEventListener("loadstart", function() {
    //   console.log("loadstart")
    // })
    // f.upload.addEventListener("load", function() {
    //   console.log("load")
    // })
    f.upload.addEventListener("progress", function progressFunction(evt){
      if (!evt.lengthComputable) {
        return
      }
      self.renderProgress(evt.loaded, evt.total)
      self._options.onProgress(evt.loaded, evt.total, self.assembly)
    })

    f.open('POST', url)
    f.send(formData)
    cb()
  }

  Uploader.prototype._startWithResumabilitySupport = function (cb) {
    var self = this

    var formData = this._prepareFormData()
    this._appendTusFileCount(formData)
    this._appendFilteredFormFields(formData)
    this._appendCustomFormData(formData)

    function proceed () {
      var endpoint = PROTOCOL + self.instance + self._options.resumableEndpointPath

      // @todo: add support for files from custom formData
      // @todo Unused?
      // var bytesExpected = this._countTotalBytesExpected()

      self.$files.each(function () {
        var nameAttr = $(self).attr('name')
        for (var i = 0; i < self.files.length; i++) {
          var file = self.files[i]
          var upload = new tus.Upload(file, {
            endpoint: endpoint,
            resume: true,
            metadata: {
              fieldname: nameAttr,
              filename: file.name,
              assembly_id: self.assemblyId
            },
            onError: function (error) {
              console.log('Failed because: ' + error)
            },
            onProgress: function (bytesUploaded, bytesTotal) {
              self.renderProgress(bytesUploaded, bytesTotal)
              self._options.onProgress(bytesUploaded, bytesTotal, self.assembly)
            }
          })
          upload.start()
        }
      })
    }

    var url = this._options['service']
    var f = new XMLHttpRequest()
    f.open('POST', url)
    f.onreadystatechange = function () {
      if (f.readyState === 4 && f.status === 200) {
        var resp = JSON.parse(f.responseText)
        self.assemblyId = resp.assembly_id
        self.instance = resp.instance
        proceed()
      }
    }
    f.send(formData)
    cb()
  }

  Uploader.prototype._prepareFormData = function (form) {
    var assemblyParams = this._options.params
    if (this.$params) {
      assemblyParams = this.$params.val()
    }
    if (typeof assemblyParams !== 'string') {
      assemblyParams = JSON.stringify(assemblyParams)
    }

    var result = {}
    if (this._options.formData instanceof FormData) {
      result = this._options.formData
    } else {
      result = new FormData(form)
    }

    result.append('params', assemblyParams)
    if (this._options.signature) {
      result.append('signature', this._options.signature)
    }

    return result
  }

  Uploader.prototype._appendTusFileCount = function (formData) {
    var fileCount = 0
    this.$files.each(function () {
      fileCount += this.files.length
    })
    formData.append('tus_num_expected_upload_files', fileCount)
  }

  Uploader.prototype._appendFilteredFormFields = function (formData, allowFiles) {
    var $fields = this._getFilteredFormFields(allowFiles)

    $fields.each(function () {
      var name = $(this).attr('name')
      if (!name) {
        return
      }
      for (var i = 0; i < this.files.length; i++) {
        formData.append(name, this.files[i])
      }
    })
  }

  Uploader.prototype._appendCustomFormData = function (formData) {
    if (!this._options.formData) {
      return
    }

    for (var i = 0; i < this._options.formData.length; i++) {
      var tupel = this._options.formData[i]
      formData.append(tupel[0], tupel[1], tupel[2])
    }
  }

  Uploader.prototype._getAssemblyRequestTargetUrl = function () {
    var result = PROTOCOL + this.instance + '/assemblies/'
    result += this.assemblyId + '?redirect=false'

    return result
  }

  Uploader.prototype._countTotalBytesExpected = function () {
    var result = 0
    this.$files.each(function () {
      // @todo Unused?
      // var nameAttr = $(this).attr('name')
      for (var i = 0; i < this.files.length; i++) {
        if (this.files[i].size) {
          result += this.files[i].size
        }
      }
    })

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
    var $fields = this.$form.find(':input[type!=submit]')
    if (!allowFiles) {
      $fields = $fields.filter('[type!=file]')
    }

    return $fields.filter(fieldsFilter)
  }

  Uploader.prototype.clone = function ($obj) {
    var $result = $obj.clone()
    var myTextareas = $obj.filter('textarea')
    var resultTextareas = $result.filter('textarea')

    for (var i = 0; i < myTextareas.length; ++i) {
      $(resultTextareas[i]).val($(myTextareas[i]).val())
    }

    return $result
  }

  Uploader.prototype.detectFileInputs = function () {
    var $files = this.$form
      .find('input[type=file]')
      .not(this._options.exclude)

    if (!this._options['processZeroFiles']) {
      $files = $files.filter(function () {
        return this.value !== ''
      })
    }
    this.$files = $files
  }

  Uploader.prototype.validate = function () {
    if (!this._options.params) {
      var $params = this.$form.find('input[name=params]')
      if (!$params.length) {
        alert('Could not find input[name=params] in your form.')
        return
      }

      this.$params = $params
      try {
        this.params = JSON.parse($params.val())
      } catch (e) {
        alert('Error: input[name=params] seems to contain invalid JSON.')
        return
      }
    } else {
      this.params = this._options.params
    }

    if (this.params.redirect_url) {
      this.$form.attr('action', this.params.redirect_url)
    } else if (this._options.autoSubmit && (this.$form.attr('action') === this._options.service + 'assemblies')) {
      alert('Error: input[name=params] does not include a redirect_url')
      return
    }
  }

  Uploader.prototype._poll = function (query) {
    var self = this
    if (this.ended) {
      return
    }

    // Reduce Firefox Title Flickering
    var match = /(mozilla)(?:.*? rv:([\w.]+))?/.exec(navigator.userAgent)
    var isMozilla = match && match[1]
    this.documentTitle = document.title
    if (isMozilla && !this.documentTitle) {
      document.title = 'Loading...'
    }

    this.pollStarted = +new Date()

    var instance = 'status-' + this.instance
    var url = PROTOCOL + instance + '/assemblies/' + this.assemblyId

    if (query) {
      url += query
    }

    $.jsonp({
      url: url,
      timeout: self._options.pollTimeout,
      callbackParameter: 'callback',
      success: function (assembly) {
        if (self.ended) {
          return
        }

        self.assembly = assembly
        if (assembly.error === 'ASSEMBLY_NOT_FOUND') {
          self.pollRetries++

          if (self.pollRetries > self._options.poll404Retries) {
            document.title = self.documentTitle
            self.ended = true
            self.renderError(assembly)
            self._options.onError(assembly)
            return
          }

          setTimeout(function () {
            self._poll()
          }, 400)
          return
        }
        if (assembly.error) {
          self.ended = true
          self.renderError(assembly)
          document.title = self.documentTitle
          self._options.onError(assembly)
          return
        }

        if (!self.started && assembly.bytes_expected > 0) {
          self.started = true
          self._options.onStart(assembly)
        }

        self.pollRetries = 0
        // @todo: Unused?
        // var isUploading = assembly.ok === 'ASSEMBLY_UPLOADING'
        var isExecuting = assembly.ok === 'ASSEMBLY_EXECUTING'
        var isCanceled = assembly.ok === 'ASSEMBLY_CANCELED'
        var isComplete = assembly.ok === 'ASSEMBLY_COMPLETED'

        if (assembly.bytes_expected > 0) {
          self._options.onProgress(assembly.bytes_received, assembly.bytes_expected, assembly)
        }

        for (var i = 0; i < assembly.uploads.length; i++) {
          var upload = assembly.uploads[i]

          if ($.inArray(upload.id, self._uploadFileIds) === -1) {
            self._options.onUpload(upload, assembly)
            self.uploads.push(upload)
            self._uploadFileIds.push(upload.id)
          }
        }

        for (var step in assembly.results) {
          self.results[step] = self.results[step] || []

          for (var j = 0; j < assembly.results[step].length; j++) {
            var result = assembly.results[step][j]
            var resultId = step + '_' + result.id

            if ($.inArray(resultId, self._resultFileIds) === -1) {
              self._options.onResult(step, result, assembly)
              self.results[step].push(result)
              self._resultFileIds.push(resultId)
            }
          }
        }

        if (isCanceled) {
          self.ended = true
          document.title = self.documentTitle
          self._options.onCancel(assembly)
          return
        }

        this._assemblyComplete = isComplete || (!self._options['wait'] && isExecuting)
        if (this._assemblyComplete) {
          self.ended = true
          document.title = self.documentTitle
          assembly.uploads = self.uploads
          assembly.results = self.results
          self._options.onSuccess(assembly)

          // give the progressbar some time to finish to 100%
          setTimeout(function () {
            if (self._options.modal) {
              self.cancel()
            }
            self.submitForm()
          }, 600)
          return
        }

        var ping = self.pollStarted - +new Date()
        var timeout = ping < self._options.interval ? self._options.interval : ping

        self.timer = setTimeout(function () {
          self._poll()
        }, timeout)
      },
      error: function (xhr, status, jsonpErr) {
        if (self.ended) {
          return
        }

        self.pollRetries++
        if (self.pollRetries > self._options.pollConnectionRetries) {
          document.title = self.documentTitle
          self.ended = true

          var reason = 'JSONP status poll request status: ' + status
          reason += ', err: ' + jsonpErr

          var err = {
            error: 'CONNECTION_ERROR',
            message: self.i18n('errors.CONNECTION_ERROR'),
            reason: reason,
            url: url
          }
          self.renderError(err)
          self._options.onError(err)
          return
        }

        setTimeout(function () {
          self._poll()
        }, 350)
      }
    })
  }

  Uploader.prototype.stop = function () {
    document.title = this.documentTitle
    this.ended = true
  }

  Uploader.prototype.cancel = function () {
    // @todo this has still a race condition if a new upload is started
    // while the cancel request is still being executed. Shouldn't happen
    // in real life, but needs fixing.

    if (!this.ended) {
      var self = this
      if (this.$params) {
        this.$params.prependTo(this.$form)
      }
      clearTimeout(this.timer)
      this._poll('?method=delete')
    }

    if (this._options.modal) {
      this.hideModal()
    }
  }

  Uploader.prototype.submitForm = function () {
    // prevent that files are uploaded to the final destination
    // after all that is what we use this plugin for :)
    if (this.$form.attr('enctype') === 'multipart/form-data') {
      this.$form.removeAttr('enctype')
    }

    if (this.assembly !== null) {
      $('<textarea/>')
        .attr('name', 'transloadit')
        .text(JSON.stringify(this.assembly))
        .prependTo(this.$form)
        .hide()
    }

    if (this._options.autoSubmit) {
      this.$form
        .unbind('submit.transloadit')
        .submit()
    }
  }

  Uploader.prototype.hideModal = function () {
    $.mask.close()
    this.$modal.remove()
  }

  Uploader.prototype.showModal = function () {
    this.$modal =
      $('<div id="transloadit">' +
        '<div class="content">' +
          '<a href="#close" class="close">' + this.i18n('cancel') + '</a>' +
          '<p class="status"></p>' +
          '<div class="progress progress-striped">' +
            '<div class="bar"><span class="percent"></span></div>' +
          '</div>' +
          '<label>' + this.i18n('startingUpload') + '</label>' +
          '<p class="error"></p>' +
          '<div class="error-details-toggle"><a href="#">' + this.i18n('details') + '</a></div>' +
          '<p class="error-details"></p>' +
        '</div>' +
      '</div>')
      .appendTo('body')

    $.extend(this.$modal, {
      '$content': this.$modal.find('.content'),
      '$close': this.$modal.find('.close'),
      '$label': this.$modal.find('label'),
      '$progress': this.$modal.find('.progress'),
      '$percent': this.$modal.find('.progress .percent'),
      '$progressBar': this.$modal.find('.progress .bar'),
      '$error': this.$modal.find('.error'),
      '$errorDetails': this.$modal.find('.error-details'),
      '$errorDetailsToggle': this.$modal.find('.error-details-toggle')
    })

    var self = this

    this.$modal.$error.hide()
    this.$modal.$errorDetails.hide()
    this.$modal.$errorDetailsToggle.hide()

    this.$modal.expose({
      api: true,
      maskId: 'transloadit_expose',
      opacity: 0.9,
      loadSpeed: 250,
      closeOnEsc: false,
      closeOnClick: false
    })

    this.$modal.$close.click(function () {
      self.cancel()
      return false
    })
  }

  Uploader.prototype.renderError = function (err) {
    if (!this._options.modal) {
      return
    }

    if (!this._options.debug) {
      return this.cancel()
    }

    this.$modal.$content.addClass('content-error')
    this.$modal.$progress.hide()
    this.$modal.$label.hide()

    var errorMsg = err.error + ': ' + err.message + '<br /><br />'
    errorMsg += (err.reason || '')

    var errorsRequiringDetails = [
      'CONNECTION_ERROR',
      'BORED_INSTANCE_ERROR',
      'ASSEMBLY_NOT_FOUND'
    ]
    if ($.inArray(err.error, errorsRequiringDetails) === -1) {
      this.$modal.$error.html(errorMsg).show()
      return
    }

    var text = this.i18n('errors.unknown') + '<br/>' + this.i18n('errors.tryAgain')
    this.$modal.$error.html(text).show()

    var assemblyId = err.assemblyId ? err.assemblyId : this.assemblyId
    var self = this
    var ip = null

    $.getJSON(PROTOCOL + 'jsonip.com/', function (ipData) {
      ip = ipData.ip
    })
    .always(function () {
      var details = {
        endpoint: err.url,
        instance: self.instance,
        assembly_id: assemblyId,
        ip: ip,
        time: self.getUTCDatetime(),
        agent: navigator.userAgent,
        poll_retries: self.pollRetries,
        error: errorMsg
      }
      $.post(PROTOCOL + 'status.transloadit.com/client_error', details)

      var detailsArr = []
      for (var key in details) {
        detailsArr.push(key + ': ' + details[key])
      }

      var detailsTxt = self.i18n('errors.troubleshootDetails') + '<br /><br />'
      self.$modal.$errorDetails.hide().html(detailsTxt + detailsArr.join('<br />'))

      self.$modal.$errorDetailsToggle.show().find('a')
        .off('click')
        .on('click', function (e) {
          e.preventDefault()
          self.$modal.$errorDetails.toggle()
        })
    })
  }

  Uploader.prototype.renderProgress = function (received, expected) {
    if (!this._options.modal) {
      return
    }
    var waitIsTrue = this._options['wait']
    var progress = received / expected * 100
    if (progress > 100) {
      progress = 0
    }

    var bytesReceived = received - this._bytesReceivedBefore
    var timeSinceLastProgEvent = +new Date() - this._lastProgressEventOn
    this._lastProgressEventOn = +new Date()
    this._bytesReceivedBefore = received

    var mbReceived = (received / 1024 / 1024).toFixed(2)
    var mbExpected = (expected / 1024 / 1024).toFixed(2)
    var uploadRate = ((bytesReceived / 1024) / (timeSinceLastProgEvent / 1000)).toFixed(1)

    var outstanding = expected - received
    var speedInBytes = (bytesReceived / (timeSinceLastProgEvent / 1000)).toFixed(1)

    var durationLeft = ''
    if (speedInBytes > 0) {
      durationLeft = this._duration(outstanding / speedInBytes)
    }

    var txt = this.i18n('uploadProgress',
      mbReceived, mbExpected, uploadRate, durationLeft
    )

    if (!this._animatedTo100) {
      this.$modal.$label.text(txt)
    }

    var totalWidth = parseInt(this.$modal.$progress.css('width'), 10)


    if (bytesReceived <= 0 && !this._assemblyComplete) {
      return
    }

    var self = this
    this.$modal.$progressBar.stop().animate(
      {width: progress + '%'},
      {
        duration: 500,
        easing: 'linear',
        progress: function (promise, currPercent, remainingMs) {
          var width = parseInt(self.$modal.$progressBar.css('width'), 10)

          var percent = (width * 100 / totalWidth).toFixed(0)
          if (percent > 100) {
            percent = 100
          }
          if (percent > 13 && !self._animatedTo100) {
            self.$modal.$percent.text(percent + '%')
          }

          if (percent == 100 && !self._animatedTo100) {
            self._animatedTo100 = true
            setTimeout(function () {
              self.$modal.$label.text(self.i18n('processingFiles'))
              self.$modal.$progress.addClass('active')
              self.$modal.$percent.text('')
            }, 500)
          }
        }
      }
    )
  }

  Uploader.prototype.includeCss = function () {
    if (CSS_LOADED || !this._options.modal) {
      return
    }

    CSS_LOADED = true
    $('<link rel="stylesheet" type="text/css" href="' + this._options.assets + 'css/transloadit2-latest.css" />')
      .appendTo('head')
  }

  Uploader.prototype.getUTCDatetime = function () {
    var now = new Date()
    var d = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    )

    var pad = function (n) {
      return n < 10 ? '0' + n : n
    }
    var tz = d.getTimezoneOffset()
    var tzs = (tz > 0 ? '-' : '+') + pad(parseInt(tz / 60, 10))

    if (tz % 60 !== 0) {
      tzs += pad(tz % 60)
    }

    if (tz === 0) {
      tzs = 'Z'
    }

    return d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + 'T' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes()) + ':' +
        pad(d.getSeconds()) + tzs
  }

  Uploader.prototype._duration = function (t) {
    var min = 60
    var h = 60 * min
    var hours = Math.floor(t / h)

    t -= hours * h

    var minutes = Math.floor(t / min)
    t -= minutes * min

    var r = ''
    if (hours > 0) {
      r += hours + 'h '
    }
    if (minutes > 0) {
      r += minutes + 'min '
    }
    if (t > 0) {
      t = t.toFixed(0)
      r += t + 's'
    }

    if (r === '') {
      r = '0s'
    }

    return r
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

  Uploader.prototype.i18n = function () {
    var args = Array.prototype.slice.call(arguments)
    var key = args.shift()
    var locale = this._options.locale
    var translated = I18N[locale] && I18N[locale][key] || I18N.en[key]
    if (!translated) {
      throw new Error('Unknown i18n key: ' + key)
    }

    return sprintf(translated, args)
  }
}(window.jQuery))
