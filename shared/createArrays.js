const fs = require('fs')
const { parse } = require('csv-parse')

let mainArray = []

// In mainArrays.csv, place all your needed supportArrays.  Creates an array to use in next function.
createMainArray = async () => {
    return new Promise((resolve, reject) => {
        fs.createReadStream(`./data/mainArrays.csv`)
        .pipe(parse({ delimiter: ",", columns: true, skip_empty_lines: true }))
        .on('data', function (row) {
            mainArray.push(row) 
        })
        .on('end', function() {
            resolve(mainArray)
            //console.log(mainArray)
        })
        .on('error', function(err) {
            reject(err)
        })
    })
}

// Transform function to convert "true"/"false" strings to booleans
const transformRow = (row) => {
    const booleanFields = ['is_syncing', 'trust']
    const nullFields = ['rank', 'durationMs', 'composite_score']

    booleanFields.forEach(field => {
        if (row[field] === 'true') {
            row[field] = true
        } else if (row[field] === 'false') {
            row[field] = false
        }
    })

    nullFields.forEach(field => {
        if (row[field] === 'null' || row[field] === 'undefined') {
            row[field] = null
        }
    })

    return row
}

// Creates the needed supportArrays as defined in your mainArrays.csv.  Each will take the name given in that file.
createSupportArrays = async () => {
    const promises = mainArray.map((row) => {
        return new Promise((resolve, reject) => {
            const newArray = []

            fs.createReadStream(`./data/${row.file}`)
            .pipe(parse({ delimiter: ",", columns: true, skip_empty_lines: true }))
            .on('data', function (data) {
                if (row.name === 'rpcPool' || row.name === 'wssPool') {
                    newArray.push(transformRow(data))
                } else {
                    newArray.push(data)
                }
            })
            .on('end', function() {
                resolve({ name: row.name, data: newArray })
            })
            .on('error', function(err) {
                reject(err)
            })
        })
    })

    return Promise.all(promises)
    .then((result) => {
        const namedArrays = {}
        result.forEach((item) => {
            namedArrays[item.name] = item.data
        })
        return namedArrays
    })
}

module.exports = { 
    createMainArray,
    createSupportArrays
  }