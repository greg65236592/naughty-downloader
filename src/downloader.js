var https = require('https')
var fs = require('fs')
var URL = require('url').URL
var fileUtil = require('./file_util')

const threads = 15
var completeThreads = 0

console.log(process.argv)
const url = new URL(process.argv[2])
const host = url.hostname
const searchParams = url.searchParams ? `?${url.searchParams.toString()}` : ''
const path = url.pathname + searchParams
const outputFolder = 'output'
const downlaodFilePartPrefix = 'naughty-prefix-'
var outputFileName = url.pathname.substring(url.pathname.lastIndexOf('/') + 1)

// do not uncomment, for debugging
// fileUtil.mergeFile(outputFolder, downlaodFilePartPrefix, outputFileName)
// process.exit(0)

// create folder
fs.existsSync(outputFolder) || fs.mkdirSync(outputFolder)

// clean
fileUtil.cleanFile(outputFolder, downlaodFilePartPrefix)

var fileCounter = 0
// rangeStart = 0,
var rangeStart = 0
var rangeEnd = 1024 * 1024
var rangeSize = 0 // init value

for (var i = 0; i < threads; i++) {
  if (i === 0) {
    sendRequest(rangeStart, rangeEnd, fileCounter)
  } else {
    callNext(rangeStart, rangeEnd)
  }
}

function sendRequest (rangeStart, rangeEnd, fileCounter) {
  if (rangeSize === 0 ||
        (rangeSize !== 0 && rangeEnd < rangeSize)) {
    console.log(`recRequest ${rangeStart}-${rangeEnd} : ${rangeSize}`)
    var localfileCounter = fileCounter

    var options = {
      host,
      path,
      method: 'GET',
      headers: {
        Range: `bytes=${rangeStart}-${rangeEnd}`
      }
    }
    var req = https.request(options, function (res) {
      console.log(`Connected range:${rangeStart}-${rangeEnd}`)
      // set rangeSize
      if (rangeSize === 0) {
        rangeSize = res.headers['content-range'].split('/')[1]
        console.log(`rangeSize: ${rangeSize}`)
      }
      // output file
      console.log(`statusCode: ${res.statusCode}`)
      if (res.statusCode !== 206 &&
                res.statusCode !== 200) { // check status and then write file
        // FIXME no need?
        // req.end();
        return
      }
      let resultFileName = `${outputFolder}/${downlaodFilePartPrefix}${String(localfileCounter).padStart(6, '0')}`
      console.log(`Satrt to pipe file: ${resultFileName}`)
      if(fs.existsSync(resultFileName)) {
        fs.unlinkSync(resultFileName)
      }
      var file = fs.createWriteStream(resultFileName)
      res.pipe(file)
      res.on('end', () => {
        console.log('end writing:' + localfileCounter)
        callNext(rangeStart, rangeEnd)
      })
    })

    req.on('error', (e) => {
      console.error(e)
      console.error(`error occured, retrying ${rangeStart} ${rangeEnd} ${localfileCounter}`)
      retry(rangeStart, rangeEnd, localfileCounter)
    })

    req.end()
  } else {
    completeThreads++
    console.log(`download complete, thread ${completeThreads}`)
    if (completeThreads == threads) {
      // merge the file after all threads completed
      fileUtil.mergeFile(outputFolder, downlaodFilePartPrefix, outputFileName)
      // clean all file parts
      fileUtil.cleanFile(outputFolder, downlaodFilePartPrefix)
    }
  }
}

function callNext () {
  console.log(`calling next...${rangeStart}-${rangeEnd} ${fileCounter}`)
  rangeStart += 1024 * 1024 + 1
  rangeEnd += 1024 * 1024 + 1
  fileCounter++
  sendRequest(rangeStart, rangeEnd, fileCounter)
}

/**
 * TODO check retry data chunk numbers
 *
 * @param {*} retryRangeStart
 * @param {*} retryRangeEnd
 * @param {*} currentFileCounter
 */
function retry (retryRangeStart, retryRangeEnd, currentFileCounter) {
  console.log(`retrying current...${retryRangeStart}-${retryRangeEnd} ${currentFileCounter}`)
  sendRequest(retryRangeStart, retryRangeEnd, currentFileCounter)
}
