var uuid = require('uuid')

function Assembly(opts) {
  this._instance = opts.instance
  this._protocol = opts.protocol

  this._id = uuid.v4().replace(/\-/g, "")
  this._url = this._protocol + this._instance + '/assemblies/' + this._id
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
