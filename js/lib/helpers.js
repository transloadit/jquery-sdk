const helpers = {
  getUTCDatetime() {
    const now = new Date()
    const dateObj = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
    )

    const zeroPad = (numberToPad) => (numberToPad < 10 ? `0${numberToPad}` : numberToPad)

    const timezoneOffset = dateObj.getTimezoneOffset()
    let tzs = (timezoneOffset > 0 ? '-' : '+') + zeroPad(parseInt(timezoneOffset / 60, 10))

    if (timezoneOffset % 60 !== 0) {
      tzs += zeroPad(timezoneOffset % 60)
    }

    if (timezoneOffset === 0) {
      tzs = 'Z'
    }

    return `${dateObj.getFullYear()}-${zeroPad(dateObj.getMonth() + 1)}-${zeroPad(
      dateObj.getDate(),
    )}T${zeroPad(dateObj.getHours())}:${zeroPad(dateObj.getMinutes())}:${zeroPad(
      dateObj.getSeconds(),
    )}${tzs}`
  },
  duration(t) {
    const min = 60
    const h = 60 * min
    const hours = Math.floor(t / h)

    t -= hours * h

    const minutes = Math.floor(t / min)
    t -= minutes * min

    let r = ''
    if (hours > 0) {
      r += `${hours}h `
    }
    if (minutes > 0) {
      r += `${minutes}min `
    }
    if (t > 0) {
      t = t.toFixed(0)
      r += `${t}s`
    }

    if (r === '') {
      r = '0s'
    }

    return r
  },
  sprintf(str, args = []) {
    return str.replace(/(%[s])/g, (m, i, s) => {
      const arg = args.shift()
      if (!arg && arg !== 0) {
        return ''
      }
      return `${arg}`
    })
  },
}

module.exports = helpers
