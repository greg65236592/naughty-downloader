var fs = require('fs');

function mergeFile(outputFileName) {
    var filesCompleted = fs.readdirSync('output')
    filesCompleted.sort((a, b) => {
        return a - b;
    });
    const outputFilePath = `output/${outputFileName}`
    var finalFile = fs.createWriteStream(outputFilePath);
    filesCompleted.forEach(fileName => {
        console.log("combine existed file: " + fileName)
        var buffer = fs.readFileSync("output/" + fileName);
        fs.appendFileSync(outputFilePath, buffer);
    });
}

exports.mergeFile = mergeFile