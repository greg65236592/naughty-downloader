var fs = require('fs')

function cleanFile (outputFolder, downlaodFilePartPrefix) {
  var files = fs.readdirSync(outputFolder)
  files.forEach(fileName => {
    if (fileName.startsWith(downlaodFilePartPrefix)) {
      console.log('remove existed file: ' + fileName)
      fs.unlinkSync(`${outputFolder}/${fileName}`)
    }
  })
}

function mergeFile (outputFolder, downlaodFilePartPrefix, outputFileName) {
  var filesCompleted = fs.readdirSync(outputFolder)
  filesCompleted.sort((a, b) => {
    return a.localeCompare(b)
  })
  const outputFilePath = `${outputFolder}/${outputFileName}`
  // clean before append
  if (fs.existsSync(outputFilePath)) {
    console.log('duplicate outputfile, cleaning...')
    fs.unlinkSync(outputFilePath)
  }

  filesCompleted.forEach(fileName => {
    if (fileName.startsWith(downlaodFilePartPrefix)) {
      console.log('combine existed file: ' + fileName)
      var buffer = fs.readFileSync(`${outputFolder}/${fileName}`)
      fs.appendFileSync(outputFilePath, buffer)
    }
  })
}

exports.cleanFile = cleanFile
exports.mergeFile = mergeFile
