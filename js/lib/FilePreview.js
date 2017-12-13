class FilePreview {
  constructor (opts) {
    if (!opts) {
      opts = {}
    }

    this.$ = opts.$
    this._$el = opts.$el
    this.onFileRemove = opts.onFileRemove || (() => {})

    this._$ul = this.$('<ul />').appendTo(this._$el)
    this._bindEvents()
  }

  _bindEvents () {
    const self = this
    const $    = this.$

    this._$el.on('click', '.remove_file', function (e) {
      e.stopPropagation()
      e.preventDefault()

      const $li = $(this).parent()
      const file = {
        size        : $li.data('size'),
        name        : $li.data('name'),
        lastModified: $li.data('lastModified'),
      }
      self.onFileRemove(file)
    })
  }

  addFile (file) {
    const size = this._niceSize(file.size)

    const closeLink = '<a href="#" class="remove_file">Remove</a>'

    // prevent xss
    let fileName = file.name.replace(/</g, '&lt;')
    fileName = fileName.replace(/>/g, '&gt;')

    const html = `<li>${fileName} - ${size} - ${closeLink}</li>`
    const $li = this.$(html).appendTo(this._$ul)

    $li.data('size', file.size)
    $li.data('name', fileName)
    $li.data('lastModified', file.lastModified)
  }

  removeFile (file) {
    const $ = this.$

    this._$ul.find('li').each(function () {
      const name = $(this).data('name')
      const size = $(this).data('size')
      const lastModified = $(this).data('lastModified')

      if (name === file.name && size === file.size && lastModified === file.lastModified) {
        $(this).remove()
      }
    })
  }

  removeAllFiles (file) {
    this._$ul.find('li').remove()
  }

  _niceSize (bytes) {
    let result = `${bytes}bytes`
    const aMultiples = ['KB', 'MB', 'GB']
    let nMultiple = 0
    let nApprox = bytes / 1024

    while (nApprox > 1) {
      result = nApprox.toFixed(1) + aMultiples[nMultiple]
      nApprox /= 1024
      nMultiple++
    }

    return result
  }
}

module.exports = FilePreview
