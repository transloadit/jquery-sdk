const helpers = require('./helpers')
require('../dep/toolbox.expose')

class Modal {
  constructor({ i18n, onClose, $ } = {}) {
    this._$modal = null
    this._lastUploadSpeedUpdateOn = 0
    this._uploadRate = null
    this._durationLeft = null
    this._bytesReceivedBefore = 0
    this._animatedTo100 = false

    this._i18n = i18n
    this.onClose = onClose || (() => {})
    this.$ = $
  }

  reset() {
    this._uploadRate = null
    this._durationLeft = null
    this._lastUploadSpeedUpdateOn = 0
    this._bytesReceivedBefore = 0
    this._animatedTo100 = false
  }

  hide() {
    this.$.mask.close()

    if (!this._$modal) {
      return
    }
    this._$modal.remove()
    this._$modal = null
  }

  show() {
    // Make sure to not show a second modal
    if (this._$modal) {
      return
    }

    const cancelTxt = this._i18n.translate('cancel')
    const startingUploadTxt = this._i18n.translate('startingUpload')
    const detailsTxt = this._i18n.translate('details')

    this._$modal = this.$(
      `<div id="transloadit">
        <div class="content">
          <a href="#close" class="close">${cancelTxt}</a>
          <p class="status"></p>
          <div class="progress progress-striped">
            <div class="bar">
              <span class="percent"></span>
            </div>
          </div>
          <label>${startingUploadTxt}</label>
          <p class="error"></p>
          <div class="error-details-toggle">
            <a href="#">${detailsTxt}</a>
          </div>
          <p class="error-details"></p>
        </div>
      </div>`
    ).appendTo('body')

    this.$.extend(this._$modal, {
      $content: this._$modal.find('.content'),
      $close: this._$modal.find('.close'),
      $label: this._$modal.find('label'),
      $progress: this._$modal.find('.progress'),
      $percent: this._$modal.find('.progress .percent'),
      $progressBar: this._$modal.find('.progress .bar'),
      $error: this._$modal.find('.error'),
      $errorDetails: this._$modal.find('.error-details'),
      $errorDetailsToggle: this._$modal.find('.error-details-toggle'),
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
      closeOnClick: false,
    })

    const self = this
    this._$modal.$close.click(() => {
      self.onClose()
      return false
    })
  }

  renderError(err) {
    if (!this._$modal) {
      return
    }

    this._toggleErrorTexts(true)
    this._toggleProgressTexts(false)

    if (!err.message) {
      err.message = `${this._i18n.translate('errors.unknown')} ${this._i18n.translate(
        'errors.tryAgain'
      )}`
    }

    this._$modal.$error.html(err.message).show()

    const errorsRequiringDetails = ['SERVER_CONNECTION_ERROR', 'ASSEMBLY_NOT_FOUND']
    if (errorsRequiringDetails.indexOf(err.error) === -1) {
      return
    }

    const self = this
    let ip = null

    this.$.getJSON('https://jsonip.com/', (ipData) => {
      ip = ipData.ip
    }).always(() => {
      const details = {
        endpoint: err.url,
        instance: err.instance,
        assembly_id: err.assemblyId,
        ip,
        time: helpers.getUTCDatetime(),
        agent: navigator.userAgent,
        error: `${err.message} ${err.reason || ''}`,
      }
      self.$.post('https://transloaditstatus.com/client_error', details)

      const detailsArr = []
      for (const key in details) {
        detailsArr.push(`${key}: ${details[key]}`)
      }

      const detailsTxt = `${self._i18n.translate('errors.troubleshootDetails')}<br /><br />`
      self._$modal.$errorDetails.hide().html(detailsTxt + detailsArr.join('<br />'))

      self._$modal.$errorDetailsToggle
        .show()
        .find('a')
        .off('click')
        .on('click', (e) => {
          e.preventDefault()
          self._$modal.$errorDetails.toggle()
        })
    })
  }

  renderCancelling(received, expected) {
    this._$modal.$label.text(this._i18n.translate('cancelling'))
  }

  renderProgress(received, expected) {
    // this._$modal can actually be gone if cancel was hit in the meantime.
    if (!this._$modal) {
      return
    }

    // If no file was selected make sure that we set the progressbar to 100%.
    let jumpTo100 = false

    if (!received && !expected && !this._bytesReceivedBefore) {
      expected = 1
      received = 1
      jumpTo100 = true
    }

    this._toggleErrorTexts(false)
    this._toggleProgressTexts(true)

    // make sure we can call this function with empty parameters to just render the previously
    // rendered progress.
    if (!received && this._animatedTo100) {
      return this._renderProcessingFiles()
    }

    let progress = (received / expected) * 100
    let progressInt = Math.floor(progress)
    if (progress > 100) {
      progress = 0
      progressInt = 0
    }

    // For some reason we sometimes get several events for 100%. Make sure to only use the first.
    if (progress === 100 && this._animatedTo100) {
      return
    }

    // Due to possible connection drops and retries, we sometimes need to reset this variable.
    if (progress < 100) {
      this._animatedTo100 = false
    }

    const timeSinceLastUploadSpeedUpdate = +new Date() - this._lastUploadSpeedUpdateOn
    const mbReceived = (received / 1024 / 1024).toFixed(2)
    const mbExpected = (expected / 1024 / 1024).toFixed(2)

    // Only update speed and remaining time every 1 second at most, otherwise the values
    // will fluctuate too much.
    let updateSpeed = timeSinceLastUploadSpeedUpdate >= 1000

    // We want to make sure we display "0s left" when the upload is done
    updateSpeed = updateSpeed || progress === 100

    // const goingBackwards = this._bytesReceivedBefore && received < this._bytesReceivedBefore

    if (!this._animatedTo100 && updateSpeed) {
      const bytesReceived = received - this._bytesReceivedBefore
      const uploadRate = (bytesReceived / 1024 / (timeSinceLastUploadSpeedUpdate / 1000)).toFixed(1)

      const outstanding = expected - received
      const speedInBytes = (bytesReceived / (timeSinceLastUploadSpeedUpdate / 1000)).toFixed(1)

      let durationLeft = ''
      if (speedInBytes > 0) {
        durationLeft = helpers.duration(outstanding / speedInBytes)
      }

      this._uploadRate = uploadRate
      this._durationLeft = durationLeft
      this._lastUploadSpeedUpdateOn = +new Date()
      this._bytesReceivedBefore = received
    }

    if (!jumpTo100) {
      const txt = this._i18n.translate(
        'uploadProgress',
        mbReceived,
        mbExpected,
        this._uploadRate,
        this._durationLeft
      )
      this._$modal.$label.text(txt)
    }

    const currPercent = this._$modal.$progressBar.data('percent')

    // if we are going backwards (due to a restart), do not animate, but reset the width
    // of the progress bar in one go
    if (currPercent > progress) {
      this._$modal.$progressBar.stop().css('width', `${progress}%`)
      this._$modal.$progressBar.data('percent', progress)
      this._setProgressbarPercent(progressInt)
      return
    }

    if (!this._animatedTo100) {
      this._$modal.$progressBar.data('percent', progress)
    }

    this._$modal.$progressBar.css('width', `${progress}%`)
    this._setProgressbarPercent(progressInt)
    const self = this

    if (progressInt === 100 && !this._animatedTo100) {
      this._animatedTo100 = true
      setTimeout(() => {
        // self._$modal can actually be gone if cancel was hit in the meantime
        if (!self._$modal) {
          return
        }
        self._renderProcessingFiles()
      }, 250)
    }
  }

  _renderProcessingFiles() {
    this._$modal.$label.text(this._i18n.translate('processingFiles'))
    this._$modal.$progress.addClass('active')
    this._$modal.$percent.text('')
  }

  _setProgressbarPercent(percent) {
    if (percent > 100) {
      percent = 100
    }
    if (percent > 20 && !this._animatedTo100) {
      this._$modal.$percent.text(`${percent}%`)
    }
    if (percent <= 20) {
      this._$modal.$percent.text('')
    }
  }

  _toggleErrorTexts(mode) {
    if (!this._$modal) {
      return
    }

    this._$modal.$error.toggle(mode)
    this._$modal.$content.toggleClass('content-error', mode)

    // error details have their own toggle-show mechanism
    if (!mode) {
      this._$modal.$errorDetails.toggle(mode)
      this._$modal.$errorDetailsToggle.toggle(mode)
    }
  }

  _toggleProgressTexts(mode) {
    if (!this._$modal) {
      return
    }

    this._$modal.$progress.toggle(mode)
    this._$modal.$label.toggle(mode)
  }
}

module.exports = Modal
