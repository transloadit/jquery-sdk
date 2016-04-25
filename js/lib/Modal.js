var helpers = require('../dep/helpers')
require('../dep/toolbox.expose')
require('../dep/jquery.easing')

function Modal(opts) {
  opts = opts || {}

  this._$modal = null
  this._lastUploadSpeedUpdateOn = 0
  this._uploadRate = null
  this._durationLeft = null
  this._bytesReceivedBefore = 0
  this._animatedTo100 = false

  this._i18n = opts.i18n
  this._locale = opts.locale
  this.onClose = opts.onClose || function() {}
}

Modal.prototype.reset = function () {
  this._uploadRate = null
  this._durationLeft = null
  this._lastUploadSpeedUpdateOn = 0
  this._bytesReceivedBefore = 0
  this._animatedTo100 = false
}

Modal.prototype.hide = function () {
  $.mask.close()

  if (!this._$modal) {
    return
  }
  this._$modal.remove()
  this._$modal = null
}

Modal.prototype.show = function () {
  // Make sure to not show a second modal
  if (this._$modal) {
    return
  }

  this._$modal =
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

  $.extend(this._$modal, {
    '$content': this._$modal.find('.content'),
    '$close': this._$modal.find('.close'),
    '$label': this._$modal.find('label'),
    '$progress': this._$modal.find('.progress'),
    '$percent': this._$modal.find('.progress .percent'),
    '$progressBar': this._$modal.find('.progress .bar'),
    '$error': this._$modal.find('.error'),
    '$errorDetails': this._$modal.find('.error-details'),
    '$errorDetailsToggle': this._$modal.find('.error-details-toggle')
  })

  this._$modal.$error.hide()
  this._$modal.$errorDetails.hide()
  this._$modal.$errorDetailsToggle.hide()

  this._$modal.expose({
    api: true,
    maskId: 'transloadit_expose',
    opacity: 0.9,
    loadSpeed: 250,
    closeOnEsc: false,
    closeOnClick: false
  })

  var self = this
  this._$modal.$close.click(function () {
    self.onClose()
    return false
  })
}

Modal.prototype.renderError = function (err) {
  this._$modal.$content.addClass('content-error')
  this._$modal.$progress.hide()
  this._$modal.$label.hide()

  var errorMsg = err.error + ': ' + err.message + '<br /><br />'
  errorMsg += (err.reason || '')

  var errorsRequiringDetails = [
    'CONNECTION_ERROR',
    'BORED_INSTANCE_ERROR',
    'ASSEMBLY_NOT_FOUND'
  ]
  if ($.inArray(err.error, errorsRequiringDetails) === -1) {
    this._$modal.$error.html(errorMsg).show()
    return
  }

  var text = this.i18n('errors.unknown') + '<br/>' + this.i18n('errors.tryAgain')
  this._$modal.$error.html(text).show()
  var self = this
  var ip = null

  $.getJSON(PROTOCOL + 'jsonip.com/', function (ipData) {
    ip = ipData.ip
  })
  .always(function () {
    var details = {
      endpoint: err.url,
      instance: err.instance,
      assembly_id: err.assemblyId,
      ip: ip,
      time: helpers._getUTCDatetime(),
      agent: navigator.userAgent,
      error: errorMsg
    }
    $.post(PROTOCOL + 'status.transloadit.com/client_error', details)

    var detailsArr = []
    for (var key in details) {
      detailsArr.push(key + ': ' + details[key])
    }

    var detailsTxt = self.i18n('errors.troubleshootDetails') + '<br /><br />'
    self._$modal.$errorDetails.hide().html(detailsTxt + detailsArr.join('<br />'))

    self._$modal.$errorDetailsToggle.show().find('a')
      .off('click')
      .on('click', function (e) {
        e.preventDefault()
        self._$modal.$errorDetails.toggle()
      })
  })
}

Modal.prototype.renderProgress = function (received, expected) {
  var progress = received / expected * 100
  if (progress > 100) {
    progress = 0
  }

  var timeSinceLastUploadSpeedUpdate = +new Date() - this._lastUploadSpeedUpdateOn
  var mbReceived = (received / 1024 / 1024).toFixed(2)
  var mbExpected = (expected / 1024 / 1024).toFixed(2)

  // Only update speed and remaining time every 1 second at most, otherwise the values
  // will fluctuate too much.
  var updateSpeed = timeSinceLastUploadSpeedUpdate >= 1000

  // We want to make sure we display "0s left" when the upload is done
  updateSpeed = updateSpeed || progress === 100

  var goingBackwards = this._bytesReceivedBefore && received < this._bytesReceivedBefore

  if (!this._animatedTo100 && updateSpeed) {
    var bytesReceived = received - this._bytesReceivedBefore
    var uploadRate = ((bytesReceived / 1024) / (timeSinceLastUploadSpeedUpdate / 1000)).toFixed(1)

    var outstanding = expected - received
    var speedInBytes = (bytesReceived / (timeSinceLastUploadSpeedUpdate / 1000)).toFixed(1)

    var durationLeft = ''
    if (speedInBytes > 0) {
      durationLeft = helpers._duration(outstanding / speedInBytes)
    }

    this._uploadRate = uploadRate
    this._durationLeft = durationLeft
    this._lastUploadSpeedUpdateOn = +new Date()
    this._bytesReceivedBefore = received
  }

  var txt = this.i18n('uploadProgress',
    mbReceived, mbExpected, this._uploadRate, this._durationLeft
  )
  this._$modal.$label.text(txt)

  var currentWidth = parseInt(this._$modal.$progress.css('width'), 10)
  var currPercent = this._$modal.$progressBar.data('percent')
  var self = this

  // if we are going backwards (due to a restart), do not animate, but reset the width
  // of the progress bar in one go
  if (currPercent > progress) {
    this._$modal.$progressBar.stop().css('width', progress + '%')
    this._$modal.$progressBar.data('percent', progress)
    this._setProgressbarPercent(progress)
    return
  }

  this._$modal.$progressBar.data('percent', progress)
  this._$modal.$progressBar.stop().animate(
    {width: progress + '%'},
    {
      duration: 1000,
      easing: 'linear',
      progress: function (promise, currPercent, remainingMs) {
        var percent = self._setProgressbarPercent(currentWidth)

        if (percent == 100 && !self._animatedTo100) {
          self._animatedTo100 = true
          setTimeout(function () {
            self._$modal.$label.text(self.i18n('processingFiles'))
            self._$modal.$progress.addClass('active')
            self._$modal.$percent.text('')
          }, 500)
        }
      }
    }
  )
}

Modal.prototype._setProgressbarPercent = function (totalWidth) {
  var width = parseInt(this._$modal.$progressBar.css('width'), 10)

  var percent = (width * 100 / totalWidth).toFixed(0)
  if (percent > 100) {
    percent = 100
  }
  if (percent > 13 && !this._animatedTo100) {
    this._$modal.$percent.text(percent + '%')
  }
  if (percent <= 13) {
    this._$modal.$percent.text('')
  }

  return percent
}

Modal.prototype._sprintf = function (str, args) {
  args = args || []
  return str.replace(/(%[s])/g, function (m, i, s) {
    var arg = args.shift()
    if (!arg && arg !== 0) {
      return ''
    }
    return arg + ''
  })
}

Modal.prototype.i18n = function () {
  var args = Array.prototype.slice.call(arguments)
  var key = args.shift()
  var locale = this._locale
  var translated = this._i18n[locale] && this._i18n[locale][key] || this._i18n.en[key]
  if (!translated) {
    throw new Error('Unknown i18n key: ' + key)
  }

  return this._sprintf(translated, args)
}

module.exports = Modal
