var https = require('https')
var fs = require('fs')
var URL = require('url').URL
var combineFile = require('./combine_file')

const threads = 15;
var completeThreads = 0;

console.log(process.argv)
const url = new URL(process.argv[2])
const host = url.hostname
const searchParams = url.searchParams ? `?${url.searchParams.toString()}` : ''
const path = url.pathname + searchParams
const outputFileName = url.toString().substring(url.toString().lastIndexOf('/')+1)

// clean
var files = fs.readdirSync('output')
files.forEach(fileName => {
    console.log("remove existed file: " + fileName)
    fs.unlinkSync("output/" + fileName)
});

// FIXME, remove unused buffer
var threadBuffer = [],
    fileCounter = 0,
    // rangeStart = 0,
    rangeStart = 0,
    rangeEnd = 1024 * 1024,
    rangeSize = 0; // init value

for (var i = 0; i < threads; i++) {
    if (i === 0) {
        sendRequest(rangeStart, rangeEnd, fileCounter)
    } else {
        callNext(rangeStart, rangeEnd);
    }
}

function sendRequest(rangeStart, rangeEnd, fileCounter) {
    if (rangeSize === 0 ||
        (rangeSize !== 0 && rangeEnd < rangeSize)) {
        console.log(`recRequest ${rangeStart}-${rangeEnd} : ${rangeSize}`)
        var localfileCounter = fileCounter;

        var options = {
            host,
            path,
            method: 'GET',
            headers: {
                Range: `bytes=${rangeStart}-${rangeEnd}`
            }
        };
        var req = https.request(options, function (res) {
            console.log(`Connected range:${rangeStart}-${rangeEnd}`);
            console.log(res.headers)
            // set rangeSize
            if (rangeSize === 0) {
                rangeSize = res.headers["content-range"].split('/')[1]
                console.log(`rangeSize: ${rangeSize}`)
            }
            // output file
            console.log(`statusCode: ${res.statusCode}`)
            if (res.statusCode !== 206 &&
                res.statusCode !== 200) { //check status and then write file
                // FIXME no need?    
                // req.end();
                return;
            }
            var file = fs.createWriteStream(`output/${localfileCounter}`);
            res.pipe(file);
            res.on('end', () => {
                console.log("end writing:" + localfileCounter)
                var index = threadBuffer.indexOf(localfileCounter);
                if (index > -1) {
                    threadBuffer.splice(index, 1);
                }
                callNext(rangeStart, rangeEnd);
            });
        });

        req.on('error', (e) => {
            console.error(e);
            console.error(`error occured, retrying ${rangeStart} ${rangeEnd} ${localfileCounter}`)
            retry(rangeStart, rangeEnd, localfileCounter);
        });

        req.end();
    } else {
        completeThreads++;
        console.log(`download complete, thread ${completeThreads}`)
        if(completeThreads == threads) {
            // merge the file after all threads completed
            combineFile.mergeFile(outputFileName)
        }
    }
}

function callNext() {
    console.log(`calling next...${rangeStart}-${rangeEnd} ${fileCounter}`)
    while (rangeSize == 0 && threadBuffer.length >= threads) {
        setTimeout(function () {
            callNext(rangeStart, rangeEnd);
        }, 1000)
        return;
    }
    rangeStart += 1024 * 1024 + 1;
    rangeEnd += 1024 * 1024 + 1;
    fileCounter++;
    sendRequest(rangeStart, rangeEnd, fileCounter);
}

/**
 * TODO check retry data chunk numbers
 * 
 * @param {*} retryRangeStart 
 * @param {*} retryRangeEnd 
 * @param {*} currentFileCounter 
 */
function retry(retryRangeStart, retryRangeEnd, currentFileCounter) {
    while (rangeSize == 0 && threadBuffer.length >= threads) {
        setTimeout(function () {
            retry(retryRangeStart, retryRangeEnd);
        }, 1000)
        return;
    }
    sendRequest(retryRangeStart, retryRangeEnd, currentFileCounter);
}
