var helpers = require('./helpers')
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
    cancelling: 'Cancelling ...',
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
    cancelling: 'キャンセル ...',
    details: '詳細',
    startingUpload: '投稿中 ...',
    processingFiles: '接続中',
    uploadProgress: '%s MB / %s MB (%s kB / 秒)'
  }
}

function I18n(locale) {
  this._dict = I18nDict
  this._locale = locale
}

I18n.getDictionary = function () {
  return this._dict
}

I18n.prototype.translate = function () {
  var args = Array.prototype.slice.call(arguments)
  var key = args.shift()
  var locale = this._locale
  var translated = this._dict[locale] && this._dict[locale][key] || this._dict.en[key]
  if (!translated) {
    throw new Error('Unknown i18n key: ' + key)
  }

  return helpers.sprintf(translated, args)
}

module.exports = I18n
