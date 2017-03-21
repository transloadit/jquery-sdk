/** @license jquery.transloadit2.js: Copyright (c) 2013 Transloadit Ltd | MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Fork this on Github: http://github.com/transloadit/jquery-sdk
 *
 * Transloadit servers allow browsers to cache jquery.transloadit2.js for 1 hour.
 * keep this in mind when rolling out fixes.
 */
require('../dep/json2')
require('../dep/jquery.jsonp')

const Assembly = require('./Assembly')
const InstanceFetcher = require('./InstanceFetcher')
const Modal = require('./Modal')
const DragDrop = require('./DragDrop')
const FilePreview = require('./FilePreview')
const InternetConnectionChecker = require('./InternetConnectionChecker')
const I18n = require('./I18n')
// const helpers = require('./helpers')
const tus = require('tus-js-client')

!($ => {
  const OPTIONS = {
    protocol                    : 'https://',
    service                     : 'https://api2.transloadit.com/',
    assets                      : 'https://assets.transloadit.com/',
    beforeStart                 : function () { return true },
    onFileSelect                : function () { },
    onStart                     : function () { },
    onProgress                  : function () { },
    onUpload                    : function () { },
    onResult                    : function () { },
    onCancel                    : function () { },
    onError                     : function () { },
    onSuccess                   : function () { },
    onDisconnect                : function () { },
    onReconnect                 : function () { },
    resumable                   : false,
    wait                        : false,
    processZeroFiles            : true,
    triggerUploadOnFileSelection: false,
    requireUploadMetaData       : false,
    autoSubmit                  : true,
    modal                       : true,
    exclude                     : '',
    fields                      : false,
    params                      : null,
    signature                   : null,
    region                      : 'us-east-1',
    locale                      : 'en',
    maxNumberOfUploadedFiles    : -1,
    connectionCheckInterval     : 3000,
    debug                       : true,
  }

  let CSS_LOADED = false

  $.fn.transloadit = function () {
    const args = Array.prototype.slice.call(arguments)
    let method
    let uploader
    let r

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

    r = uploader[method](...args)
    return r === undefined ? this : r
  }

  $.fn.transloadit.i18n = I18n.getDictionary()

  class Uploader {
    constructor () {
      this._assembly = null
      this._options = {}
      this._ended = null

      this._params = null
      this._fileCount = 0
      this._fileSizes = 0

      this._$params = null
      this._$form = null
      this._$inputs = null

      this._resumableUploads = []

      this._xhr = null
      this._dragDropObjects = []
      this._previewAreaObjects = []
      this._formData = null
      this._files = {}

      this._websocketPath = null
      this._internetConnectionChecker = null
      this._isOnline = true
    }

    init ($form, options) {
      const self = this
      this.options($.extend({}, OPTIONS, options || {}))

      this._initI18n()
      this._initModal()
      this._initInternetConnectionChecker()

      this._$form = $form
      this._initDragAndDrop()
      this._initFilePreview()

      this._detectFileInputs()

      this._$form.bind('submit.transloadit', () => {
        self.validate()
        self.start()
        return false
      })

      this._$inputs.on('change.transloadit', function () {
        const $input = $(this)
        self._updateInputFileSelection($input)
        self._options.onFileSelect($input.val(), $input)

        if (self._options.triggerUploadOnFileSelection) {
          self._$form.trigger('submit.transloadit')
        }
      })

      this.includeCss()
    }

    start () {
      this._xhr = null
      this._ended = false
      this._fileCount = 0
      this._fileSizes = 0
      this._uploadedBytes = 0

      // Remove textareas with encoding results from previous uploads to not send them
      // as form fields.
      this._$form.find('textarea[name=transloadit]').remove()
      this._modal.reset()
      this._countAddedFilesAndSizes()

      // Simply submit the form if we should not process without files
      if (this._fileCount === 0 && !this._options.processZeroFiles) {
        if (this._options.beforeStart()) {
          this.submitForm()
        }
        return
      }

      // Run beforeStart callback before doing any heavy lifting
      if (!this._options.beforeStart()) {
        return
      }

      if (!this._checkFileCountExceeded()) {
        return
      }

      if (this._options.modal) {
        this._modal.show()
      }

      const self = this

      const instanceFetcher = new InstanceFetcher({
        service: this._options.service,
        i18n   : this._i18n,
        onError (err) {
          self._renderError(err)
        },
      })
      instanceFetcher.fetch((err, instance, websocketPath) => {
        if (err) {
          return self._errorOut(err)
        }

        self._assembly = new Assembly({
          i18n: self._i18n,

          instance,
          websocketPath,
          service : self._options.service,
          protocol: self._options.protocol,

          wait                 : self._options['wait'],
          requireUploadMetaData: self._options['requireUploadMetaData'],

          onExecuting () {
            // If the assembly is executing meaning all uploads are done, we will not get more progress
            // events from XHR. But if there was a connection interruption in the meantime, we want to
            // make sure all components (like the modal) now know that the error is gone.
            self._renderProgress()

            let assemblyObj = self._buildAssemblyObj('ASSEMBLY_EXECUTING')
            self._options.onExecuting(assemblyObj)
          },
          onSuccess (assemblyResult) {
            self._ended = true
            self._options.onSuccess(assemblyResult)
            self.reset()

            if (self._options.modal) {
              self._modal.hide()
            }
            self.submitForm(assemblyResult)
          },
          onCancel (assemblyResult) {
            self._ended = true
            self._options.onCancel(assemblyResult)
          },
          onError (assemblyObjContainingError) {
            self._errorOut(assemblyObjContainingError)
          },
          onUpload (upload) {
            self._options.onUpload(upload)
          },
          onResult (step, result) {
            self._options.onResult(step, result)
          },
        })

        self._assembly.init(err => {
          if (err) {
            self._errorOut(err)
          }

          let assemblyObj = self._buildAssemblyObj('ASSEMBLY_UPLOADING')
          self._options.onStart(assemblyObj)

          if (self._options.resumable && tus.isSupported) {
            self._startWithResumabilitySupport()
          } else {
            self._startWithXhr()
          }
        })
      })
    }

    _startWithXhr (cb = () => {}) {
      const self = this
      this._formData = this._prepareFormData()

      this._appendFilteredFormFields()
      this._appendCustomFormData()
      this._appendFiles()

      this._xhr = new XMLHttpRequest()

      this._xhr.addEventListener('error', err => {
        self._xhr = null
      })
      this._xhr.addEventListener('abort', err => {
        self._xhr = null
      })
      this._xhr.addEventListener('timeout', err => {
        self._xhr = null
      })
      this._xhr.addEventListener('load', () => {
        self._xhr = null
      })

      this._xhr.upload.addEventListener('progress', function progressFunction (evt) {
        if (!evt.lengthComputable) {
          return
        }

        self._renderProgress(evt.loaded, evt.total)
        self._options.onProgress(evt.loaded, evt.total, self._assemblyResult)
      })

      const url = this._assembly.getRequestTargetUrl(true)
      this._xhr.open('POST', url)
      this._xhr.send(this._formData)
      cb()
    }

    _startWithResumabilitySupport (cb = () => {}) {
      const self = this
      this._formData = this._prepareFormData()
      this._formData.append('tus_num_expected_upload_files', this._fileCount)

      this._appendFilteredFormFields()
      this._appendCustomFormData()

      // We need this to control retries/resumes
      this._xhr = true

      function proceed () {
        // adding uploads from drag/dropped files and input fields
        for (const name in self._files) {
          for (let i = 0; i < self._files[name].length; i++) {
            const file = self._files[name][i]
            const upload = self._addResumableUpload(name, file)
            upload.start()
          }
        }
      }

      const f   = new XMLHttpRequest()
      const url = this._assembly.getRequestTargetUrl(true)

      f.open('POST', url)
      f.onreadystatechange = () => {
        if (f.readyState === 4 && f.status === 200) {
          const resp = JSON.parse(f.responseText)
          proceed()
          cb()
        }
      }
      f.send(this._formData)
    }

    _addResumableUpload (nameAttr, file) {
      const self = this
      // We need to force HTTPS in this case, because - only if the website is on
      // plain HTTP - the response to the CORS preflight request, will contain a
      // redirect to a HTTPS url. However, redirects are not allowed a responses
      // to preflight requests and causes the tus upload creation to fail.
      const endpoint = `${this._options.protocol + this._assembly.getInstance()}/resumable/files/`

      // Store the last value of bytesUploaded of the progress event from tus
      // for calculating the number of all bytes uploaded accross all uploads
      let lastBytesUploaded = 0

      const upload = new tus.Upload(file, {
        endpoint,
        // Setting resume to false, may seem a bit counterproductive but you need
        // to keep the actual effects of this setting in mind:
        //   a boolean indicating whether the client should attempt to resume the
        //   upload if the upload has been started in the past. This includes
        //   storing the file's fingerprint. Use false to force an entire reupload.
        // Right now, always want to upload the entire file for two reasons:
        // 1. Transloadit is not able to use the file uploaded from assembly A
        //    in assembly B, so we need to transfer the file for each assembly
        //    again and,
        // 2. there is no mechanism for resuming the uploading for an assembly if
        //    the Uploader object gets destroyed (for example, if the page is
        //    reloaded) so we do not know to which assembly a file belongs and
        //    more.
        resume  : false,
        metadata: {
          fieldname   : nameAttr,
          filename    : file.name,
          assembly_url: this._assembly.getUrl(),
        },
        fingerprint (file) {
          // Fingerprinting is not necessary any more since we have disabled
          // the resuming of previous uploads.
          throw new Error('fingerprinting should not happend')
        },
        onError (error) {
          self._xhr = false
          self._internetConnectionChecker.isCurrentlyOnline(online => {
            // If this is not a connection problem, bubble up the error.
            // Otherwise if this is a connection problem, we will have our own error handling for it.
            if (online) {
              self._errorOut(error)
            }
          })
        },
        onSuccess () {
          self._xhr = false
        },
        onProgress (bytesUploaded, bytesTotal) {
          // Calculate the number of uploaded bytes of all uploads by removing
          // the last known value and then adding the new value.
          self._uploadedBytes = self._uploadedBytes - lastBytesUploaded + bytesUploaded
          lastBytesUploaded = bytesUploaded

          self._renderProgress(self._uploadedBytes, self._fileSizes)
          self._options.onProgress(self._uploadedBytes, self._fileSizes, self._assemblyResult)
        }
      })

      this._resumableUploads.push(upload)
      return upload
    }

    _prepareFormData () {
      let assemblyParams = this._options.params
      if (this._$params) {
        assemblyParams = this._$params.val()
      }
      if (typeof assemblyParams !== 'string') {
        assemblyParams = JSON.stringify(assemblyParams)
      }

      let result = {}
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

    _appendFiles () {
      for (const key in this._files) {
        for (let i = 0; i < this._files[key].length; i++) {
          this._formData.append(key, this._files[key][i])
          this._fileCount++
          this._fileSizes += this._files[key][i].size
        }
      }
    }

    _updateInputFileSelection ($input) {
      const files = $input[0].files
      const name = $input.attr('name')
      if (!name) {
        return
      }

      // Remove old selection from preview areas if possible
      if (name in this._files) {
        const oldFiles = this._files[name]
        for (let i = 0; i < oldFiles.length; i++) {
          this._removeFileFromPreviewAreas(oldFiles[i])
        }
      }

      if (files.length === 0) {
        delete this._files[name]
      } else {
        if (!(name in this._files)) {
          this._files[name] = []
        }

        // Add new selection to preview areas
        for (let j = 0; j < files.length; j++) {
          const file = files[j]
          this._files[name].push(file)
          this._addFileToPreviewAreas(file)
        }
      }
    }

    _countAddedFilesAndSizes () {
      this._fileCount = 0
      this._fileSizes = 0

      for (const key in this._files) {
        for (let i = 0; i < this._files[key].length; i++) {
          this._fileCount++
          this._fileSizes += this._files[key][i].size
        }
      }
    }

    _appendFilteredFormFields () {
      const $fields = this._getFilteredFormFields()
      const self = this

      $fields.each(function () {
        const name = $(this).attr('name')
        if (!name) {
          return
        }

        if (!this.files) {
          // Files are added via appendFiles
          self._formData.append(name, $(this).val())
        }
      })
    }

    _checkFileCountExceeded () {
      if (this._options.maxNumberOfUploadedFiles === -1) {
        return true
      }

      if (this._fileCount > this._options.maxNumberOfUploadedFiles) {
        const max = this._options.maxNumberOfUploadedFiles
        const err = {
          error  : 'MAX_FILES_EXCEEDED',
          message: this._i18n.translate('errors.MAX_FILES_EXCEEDED', max),
        }
        this._errorOut(err)
        return false
      }

      return true
    }

    _appendCustomFormData () {
      if (!this._options.formData) {
        return
      }

      for (let i = 0; i < this._options.formData.length; i++) {
        const tupel = this._options.formData[i]
        this._formData.append(tupel[0], tupel[1], tupel[2])
      }
    }

    _getFilteredFormFields () {
      let fieldsFilter = '[name=params], [name=signature]'
      if (this._options.fields === true) {
        fieldsFilter = '*'
      } else if (typeof this._options.fields === 'string') {
        fieldsFilter += `, ${this._options.fields}`
      }

      // Filter out submit elements right away as they will cause funny behavior
      // in the shadow form.
      let $fields = this._$form.find(':input[type!=submit]')

      // Do not fetch file input fields as we handle uploads over this._files
      $fields = $fields.filter('[type!=file]')

      return $fields.filter(fieldsFilter)
    }

    stop () {
      if (this._assembly) {
        this._assembly.stopStatusFetching()
      }
      this._ended = true
    }

    reset () {
      this._files = {}
      this._resumableUploads = []
      this._fileCount = 0
      this._fileSizes = 0

      for (let i = 0; i < this._previewAreaObjects.length; i++) {
        this._previewAreaObjects[i].removeAllFiles()
      }
    }

    unbindEvents () {
      this._$form.unbind('submit.transloadit')
      this._$inputs.unbind('change.transloadit')
    }

    destroy () {
      this.stop()
      this.reset()
      this.unbindEvents()
      this._$form.data('transloadit.uploader', null)
    }

    cancel () {
      this._formData = this._prepareFormData()
      this._abortUpload()
      this.reset()

      const self = this
      function hideModal () {
        if (self._options.modal) {
          self._modal.hide()
        }
      }

      if (this._ended) {
        return hideModal()
      }

      if (this._$params) {
        this._$params.prependTo(this._$form)
      }

      this._modal.renderCancelling()
      this._assembly.cancel(hideModal)
    }

    submitForm (assemblyData) {
      // prevent that files are uploaded to the final destination
      // after all that is what we use this plugin for :)
      if (this._$form.attr('enctype') === 'multipart/form-data') {
        this._$form.removeAttr('enctype')
      }

      if (assemblyData !== null) {
        $('<textarea/>')
          .attr('name', 'transloadit')
          .text(JSON.stringify(assemblyData))
          .prependTo(this._$form)
          .hide()
      }

      if (this._options.autoSubmit) {
        this._$form.unbind('submit.transloadit').submit()
      }
    }

    validate () {
      if (!this._options.params) {
        const $params = this._$form.find('input[name=params]')
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

      let fileInputFieldsAreGood = true
      this._$inputs.each(function () {
        const name = $(this).attr('name')
        if (!name) {
          fileInputFieldsAreGood = false
        }
      })
      if (!fileInputFieldsAreGood) {
        alert('Error: One of your file input fields does not contain a name attribute!')
      }

      if (this._params.redirect_url) {
        this._$form.attr('action', this._params.redirect_url)
      } else if (
        this._options.autoSubmit &&
        this._$form.attr('action') === `${this._options.service}assemblies`
      ) {
        alert('Error: input[name=params] does not include a redirect_url')
        return
      }
    }

    _renderError (err) {
      if (!this._options.modal) {
        return
      }

      if (!this._options.debug) {
        return this.cancel()
      }

      if (this._assembly) {
        err.assemblyId = this._assembly.getId()
        err.instance = this._assembly.getInstance()
      }

      this._modal.renderError(err)
    }

    _detectFileInputs () {
      let $inputs = this._$form.find('input[type=file]').not(this._options.exclude)

      if (!this._options['processZeroFiles']) {
        $inputs = $inputs.filter(function () {
          return this.value !== ''
        })
      }
      this._$inputs = $inputs
    }

    _renderProgress (received, expected) {
      if (!this._options.modal) {
        return
      }
      if (!this._isOnline) {
        return
      }

      this._modal.renderProgress(received, expected)
    }

    includeCss () {
      if (CSS_LOADED || !this._options.modal) {
        return
      }

      CSS_LOADED = true
      $(
        `<link rel="stylesheet" type="text/css" href="${this._options.assets}css/transloadit3-latest.css" />`
      ).appendTo('head')
    }

    _errorOut (err) {
      if (!err.message) {
        err.message = this._i18n.translate(`errors.${err.error}`)
      }

      this._ended = true
      this._renderError(err)
      this._options.onError(err)
      this._abortUpload()
    }

    _abortUpload () {
      if (this._xhr && typeof this._xhr.abort === 'function') {
        this._xhr.abort()
      }

      for (let i = 0; i < this._resumableUploads.length; i++) {
        const upload = this._resumableUploads[i]
        upload.abort()
      }
    }

    _initI18n () {
      this._i18n = new I18n(this._locale)
    }

    _initModal () {
      const self = this
      this._modal = new Modal({
        onClose () {
          self.cancel()
        },
        i18n: this._i18n,
      })
    }

    _initDragAndDrop () {
      const $dropAreas = this._$form.find('.transloadit-drop-area')
      if ($dropAreas.length === 0) {
        return
      }

      const self = this
      let i = 0
      $dropAreas.each(function () {
        const name = $(this).data('name') || 'files'

        self._dragDropObjects[i] = new DragDrop({
          onFileAdd (file) {
            if (self._files[name]) {
              self._files[name].push(file)
            } else {
              self._files[name] = [file]
            }

            self._options.onFileSelect(file, $(this))
            self._addFileToPreviewAreas(file)
          },
          onDrop () {
            if (self._options.triggerUploadOnFileSelection) {
              self._$form.trigger('submit.transloadit')
            }
          },
          $el: $(this),
        })
        i++
      })
    }

    _initFilePreview () {
      const $previewAreas = this._$form.find('.transloadit-file-preview-area')
      if ($previewAreas.length === 0) {
        return
      }

      const self = this
      let i = 0
      $previewAreas.each(function () {
        // const name = $(this).data('name') || 'files'

        self._previewAreaObjects[i] = new FilePreview({
          onFileRemove (file) {
            self._removeFileFromFormData(file)
            self._removeFileFromPreviewAreas(file)
          },
          $el: $(this),
        })
        i++
      })
    }

    _addFileToPreviewAreas (file) {
      for (let i = 0; i < this._previewAreaObjects.length; i++) {
        this._previewAreaObjects[i].addFile(file)
      }
    }

    _removeFileFromPreviewAreas (file) {
      for (let i = 0; i < this._previewAreaObjects.length; i++) {
        this._previewAreaObjects[i].removeFile(file)
      }
    }

    _removeFileFromFormData (file) {
      for (let i = 0; i < this._previewAreaObjects.length; i++) {
        this._previewAreaObjects[i].removeFile(file)
      }

      for (const key in this._files) {
        for (let j = 0; j < this._files[key].length; j++) {
          const myFile = this._files[key][j]
          if (myFile.size !== file.size || myFile.name !== file.name) {
            continue
          }

          if (myFile.lastModified !== file.lastModified) {
            continue
          }

          this._files[key].splice(j, 1)
        }
      }
    }

    _buildAssemblyObj (ok) {
      const assemblyObj = {
        ok: ok,
        assembly_id: this._assembly.getId(),
        instance: this._assembly.getInstance(),
        assembly_url: this._assembly.getHttpUrl(),
        assembly_ssl_url: this._assembly.getHttpsUrl()
      }

      return assemblyObj
    }

    _initInternetConnectionChecker () {
      const self = this

      this._internetConnectionChecker = new InternetConnectionChecker({
        intervalLength: this._options.connectionCheckInterval,
        onDisconnect () {
          self._isOnline = false
          let errorType = 'INTERNET_CONNECTION_ERROR_UPLOAD_IN_PROGRESS'

          if (!self._xhr) {
            errorType = 'INTERNET_CONNECTION_ERROR_UPLOAD_NOT_IN_PROGRESS'
          }

          const err = {
            error  : errorType,
            message: self._i18n.translate(`errors.${errorType}`),
          }
          self._renderError(err)

          self._assembly.onDisconnect()
          self._options.onDisconnect()
        },
        onReconnect () {
          self._isOnline = true

          if (self._xhr && !self._options.resumable) {
            // Note: Google Chrome can resume xhr requests. However, we ignore this here, because
            // we have our own resume flag with tus support.
            self._abortUpload()

            // If we have an upload in progress when we get the disconnect, retry it.
            // If we do not have an upload in progress, we keep polling automatically for the status.
            // No need to take further action here for this case.
            return self.start()
          }

          // Resuming of uploads is done automatically for us in the tus client

          self._assembly.onReconnect()
          self._options.onReconnect()
        },
      })
      this._internetConnectionChecker.start()
    }

    options (options) {
      if (arguments.length === 0) {
        return this._options
      }

      $.extend(this._options, options)
    }

    option (key, val) {
      if (arguments.length === 1) {
        return this._options[key]
      }

      this._options[key] = val
    }
  }
})(window.jQuery)
