class DragDrop {
  constructor(opts) {
    if (!opts) {
      opts = {}
    }

    this._$el = opts.$el
    this._onFileAdd = opts.onFileAdd || (() => {})
    this._onDrop = opts.onDrop || (() => {})

    this._bindEvents()
  }

  _bindEvents() {
    this._$el.on('dragenter', this.dragEnterCb.bind(this))
    this._$el.on('dragexit', this.dragExitCb.bind(this))
    this._$el.on('dragover', this.dragOverCb.bind(this))
    this._$el.on('dragleave', this.dragExitCb.bind(this))
    this._$el.on('drop', this.dropCb.bind(this))
  }

  dragEnterCb(e) {
    e.stopPropagation()
    e.preventDefault()
  }

  dragExitCb(e) {
    e.stopPropagation()
    e.preventDefault()
    this._$el.removeClass('hover')
  }

  dragOverCb(e) {
    e.stopPropagation()
    e.preventDefault()
    this._$el.addClass('hover')
  }

  dropCb(e) {
    e.stopPropagation()
    e.preventDefault()
    this._$el.removeClass('hover')

    if (e.originalEvent && e.originalEvent.dataTransfer) {
      const files = e.originalEvent.dataTransfer.files
      for (const i in files) {
        if (typeof files[i] === 'object') {
          this._onFileAdd(files[i])
        }
      }
    }

    this._onDrop(e)

    return false
  }
}

module.exports = DragDrop
