const fs = require('fs')
const version = require('./package.json').version

const errorOut = (err) => {
  console.error(err)
  process.exit(1)
}

let comment = '/*\n'
comment += '  jQuery Easing v1.3: Copyright (c) 2008 George McGinley Smith | BSD License: http://www.opensource.org/licenses/bsd-license.php\n'
comment += '  jquery.transloadit2-' + version + '.js: Copyright (c) 2016 Transloadit Ltd | MIT License: http://www.opensource.org/licenses/mit-license.php\n'
comment += '\n'
comment += '  Fork this on Github: http://github.com/transloadit/jquery-sdk\n'
comment += '\n'
comment += '  Transloadit servers allow browsers to cache jquery.transloadit2.js for 1 hour.\n'
comment += '  keep this in mind when rolling out fixes.\n'
comment += '  json2: Douglas Crockford | Public domain\n'
comment += '  jQuery Tools 1.2.3: Tero Piirainen | Public domain\n'
comment += '*/'

let filePath = './build/jquery.transloadit2-v3-latest.js'
fs.readFile(filePath, 'utf8', (err, content) => {
  if (err) {
    errorOut(err)
  }

  if (content.indexOf('/*') === 0) {
    err = new Error('Comment already added.')
    errorOut(err)
  }

  content = comment + '\n' + content
  fs.writeFile(filePath, content, (err) => {
    if (err) {
      errorOut(err)
    }

    console.log('Comment added')
    process.exit(0)
  })
})
