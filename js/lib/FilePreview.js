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
    console.log('remove_file', file)
  })
}

FilePreview.prototype.addFile = function(file) {
  console.log('>>>added', file)
  var closeLink = '<a href="#" class="remove_file">X</a>'
  var html = '<li>' + file.name + ' - ' + file.size + ' - ' + closeLink + '</li>'
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
  console.log('>>>removed', file)
}

module.exports = FilePreview
