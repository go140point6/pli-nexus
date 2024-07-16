const fs = require('fs');

async function cleanUpWorkingDirectory(workingDir) {
    return new Promise((resolve, reject) => {
        fs.rm(workingDir, { recursive: true }, (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    resolve()
                } else {
                    reject('Error cleaning up working directory: ' + err.message)
                }
            } else {
                resolve()
            }
        })
    })
}

module.exports = {
    cleanUpWorkingDirectory
}