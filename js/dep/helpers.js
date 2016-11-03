var helpers = {
  getUTCDatetime: function () {
    var now = new Date()
    var dateObj = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    )

    var zeroPad = function (numberToPad) {
      return numberToPad < 10 ? '0' + numberToPad : numberToPad
    }

    var timezoneOffset = dateObj.getTimezoneOffset()
    var tzs = (timezoneOffset > 0 ? '-' : '+') + zeroPad(parseInt(timezoneOffset / 60, 10))

    if (timezoneOffset % 60 !== 0) {
      tzs += zeroPad(timezoneOffset % 60)
    }

    if (timezoneOffset === 0) {
      tzs = 'Z'
    }

    return dateObj.getFullYear() + '-' +
        zeroPad(dateObj.getMonth() + 1) + '-' +
        zeroPad(dateObj.getDate()) + 'T' +
        zeroPad(dateObj.getHours()) + ':' +
        zeroPad(dateObj.getMinutes()) + ':' +
        zeroPad(dateObj.getSeconds()) + tzs
  },
  duration: function (t) {
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
  },
  sprintf: function (str, args) {
    args = args || []
    return str.replace(/(%[s])/g, function (m, i, s) {
      var arg = args.shift()
      if (!arg && arg !== 0) {
        return ''
      }
      return arg + ''
    })
  }
}

module.exports = helpers
