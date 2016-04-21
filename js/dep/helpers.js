var helpers = {
  _getUTCDatetime: function () {
    var now = new Date()
    var d = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    )

    var pad = function (n) {
      return n < 10 ? '0' + n : n
    }
    var tz = d.getTimezoneOffset()
    var tzs = (tz > 0 ? '-' : '+') + pad(parseInt(tz / 60, 10))

    if (tz % 60 !== 0) {
      tzs += pad(tz % 60)
    }

    if (tz === 0) {
      tzs = 'Z'
    }

    return d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + 'T' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes()) + ':' +
        pad(d.getSeconds()) + tzs
  },
  _duration: function (t) {
    var min = 60
    var h = 60 * min
    var hours = Math.floor(t / h)

    t -= hours * h

    var minutes = Math.floor(t / min)
    t -= minutes * min

    var r = ''
    if (hours > 0) {
      r += hours + 'h '
    }
    if (minutes > 0) {
      r += minutes + 'min '
    }
    if (t > 0) {
      t = t.toFixed(0)
      r += t + 's'
    }

    if (r === '') {
      r = '0s'
    }

    return r
  }
}

module.exports = helpers
