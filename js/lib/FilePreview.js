function FilePreview(opts) {
  if (!opts) {
    opts = {}
  }

  this._$el = opts.$el
  this.onFileRemove = opts.onFileRemove || function() {}

  this._$ul = $('<ul />').appendTo(this._$el)
  this._bindEvents()
}

FilePreview.prototype._bindEvents = function() {
  var self = this

  this._$el.on('click', '.remove_file', function(e) {
    e.stopPropagation();
    e.preventDefault()

    var $li = $(this).parent()
    var file = {
      size: $li.data('size'),
      name: $li.data('name'),
      lastModified: $li.data('lastModified')
    }
    self.onFileRemove(file)
  })
}

FilePreview.prototype.addFile = function(file) {
  var size = this._niceSize(file.size)

  var closeLink = '<a href="#" class="remove_file">X</a>'
  var html = '<li>' + file.name + ' - ' + size + ' - ' + closeLink + '</li>'
  var $li = $(html).appendTo(this._$ul)

  $li.data('size', file.size)
  $li.data('name', file.name)
  $li.data('lastModified', file.lastModified)
}

FilePreview.prototype.removeFile = function(file) {
  this._$ul.find('li').each(function() {
    var name = $(this).data('name')
    var size = $(this).data('size')
    var lastModified = $(this).data('lastModified')

    if (name == file.name && size == file.size && lastModified == file.lastModified) {
      $(this).remove()
    }
  })
}

FilePreview.prototype._niceSize = function(bytes) {
  var result = bytes + "bytes";
  var aMultiples = ["KB", "MB", "GB"]
  var nMultiple = 0
  var nApprox = bytes / 1024

  while (nApprox > 1) {
    result = nApprox.toFixed(1) + aMultiples[nMultiple]
    nApprox /= 1024
    nMultiple++
  }

  return result
}

module.exports = FilePreview
