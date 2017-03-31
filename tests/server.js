const http = require('http')
const querystring = require('querystring')
const fs = require('fs')
const path = require('path')
// var debug = require('debug')('tlj:testserver')
// var util = require('util')

if (!process.env.TRANSLOADIT_ACCESS_KEY) {
  console.error('process.env.TRANSLOADIT_ACCESS_KEY not found. Did you source env.sh ?')
  process.exit(1)
}

function escapeHtml (string) {
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  return String(string).replace(/[&<>"'/]/g, s => entityMap[s])
}

function processPost (request, response, cb) {
  let queryData = ''

  if (request.method === 'POST') {
    request.on('data', data => {
      queryData += data
      if (queryData.length > 1e6) {
        queryData = ''
        response.writeHead(413, { 'Content-Type': 'text/plain' }).end()
        request.connection.destroy()
      }
    })

    request.on('end', () => {
      request.post = querystring.parse(queryData)
      cb()
    })
  } else {
    response.writeHead(405, { 'Content-Type': 'text/plain' })
    response.end()
  }
}

function respondHtml (res, content) {
  const headerFile = path.join(__dirname, 'fixtures', 'header.html')
  fs.readFile(headerFile, (err, header) => {
    if (err) {
      throw err
    }

    const footerFile = path.join(__dirname, 'fixtures', 'footer.html')
    fs.readFile(footerFile, (err, footer) => {
      if (err) {
        throw err
      }
      const body = header + content + footer
      res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })
      res.end(body)
    })
  })
}

function addFixturePath (content) {
  const toReplace = `<span id="fixture_path">${path.join(__dirname, 'fixtures</span>')}`
  return content.replace(/<span id="fixture_path"><\/span>/, toReplace)
}

function serveHtmlFile (res, filename) {
  const fileName = path.join(__dirname, 'fixtures', filename)

  fs.readFile(fileName, (err, content) => {
    if (err) {
      throw err
    }

    content = content.toString()
    content = addFixturePath(content)

    content = content.replace(
      /{TRANSLOADIT_ACCESS_KEY}/g,
      `${process.env.TRANSLOADIT_ACCESS_KEY}`.trim()
    )
    respondHtml(res, content)
  })
}

function serveBuildJs (res) {
  const fileName = path.join(__dirname, '../build/jquery.transloadit2-v3-latest.js')

  fs.readFile(fileName, (err, content) => {
    if (err) {
      throw err
    }

    content = content.toString()

    res.writeHead(200, 'OK', { 'Content-Type': 'text/javascript' })
    res.end(content)
  })
}

function serveSourceMap (res) {
  const fileName = path.join(__dirname, '../build/jquery.transloadit2-v3-latest.js.map')

  fs.readFile(fileName, (err, content) => {
    if (err) {
      throw err
    }

    content = content.toString()

    res.writeHead(200, 'OK', { 'Content-Type': 'text/javascript' })
    res.end(content)
  })
}

if (!process.env.TRANSLOADIT_ACCESS_KEY) {
  console.error('Found no TRANSLOADIT_ACCESS_KEY in env')
  process.exit(1)
}

http
  .createServer((req, res) => {
    if (req.method === 'POST') {
      processPost(req, res, () => {
        const stringified = JSON.stringify(req.post)
        const escaped = escapeHtml(stringified)
        respondHtml(res, `<body>${escaped}</body>`)
      })
      return
    }

    if (req.url === '/build.js' || req.url === '/build/jquery.transloadit2-v3-latest.js') {
      return serveBuildJs(res)
    }

    if (req.url === '/build/jquery.transloadit2-v3-latest.js.map') {
      return serveSourceMap(res)
    }

    if (req.url === '/shutdown') {
      res.writeHead(200, 'OK', { 'Content-Type': 'text/javascript' })
      res.end('{"status":"OK"}')
      process.exit(0)
    }

    if (req.url === '/trigger-on-file-select') {
      return serveHtmlFile(res, 'trigger_on_file_select.html')
    }

    serveHtmlFile(res, 'standard_resize.html')
  })
  .listen(3000, '127.0.0.1')

console.log('Server running at http://127.0.0.1:3000/')
