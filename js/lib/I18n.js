var helpers = require('./helpers')

function I18n(dict, locale) {
  this._dict = dict
  this._locale = locale
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
