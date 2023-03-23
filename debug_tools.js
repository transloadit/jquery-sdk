function pad(n, width, z) {
  z = z || '0'
  n = n + ''
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}

function timeDump(msg) {
  var now = new Date()
  var h = pad(now.getHours(), 2)
  var min = pad(now.getMinutes(), 2)
  var s = pad(now.getSeconds(), 2)
  var ms = pad(now.getMilliseconds(), 2)

  var time = h + ':' + min + ':' + s + '.' + ms
  console.log(time, msg)
}

module.exports = timeDump
