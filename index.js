require('dotenv').config();
const path = require('path');
//const Logger = require("@ptkdev/logger")
const cron = require('node-cron');
const { createDirectoryIfNotExists } = require('./shared/createDirectory');
const { createMainArray, createSupportArrays } = require('./shared/createArrays');
const sharedArrays = require('./shared/sharedArrays');
//const { getRpcStatus } = require('./main/rpcCheck');
const { consensusMedian } = require('./main/determineRpcConsensus');

(async () => {
    try {
        const rootPath = process.cwd()
        const folderPath = path.join(rootPath, 'logs')
        await createDirectoryIfNotExists(folderPath)
        //const logger = new Logger(logOptions)
        const main = await createMainArray()
        sharedArrays.support = await createSupportArrays()
        //await checkTrust(sharedArrays)
        //cron to checkTrust at some regular interval

        //console.log(main)
        //console.log(sharedArrays.support)

        const bestRpc = await consensusMedian(sharedArrays)
        //const bestRpc = sharedArrays.support.rpcNode.find(node => node.rank === 1)
        console.log(sharedArrays.support.rpcPool)
        console.log("Best RPC at this time: ", bestRpc)

        process.exit(0)

    } catch (error) {
        console.error("Some error: ", error)
        process.exit(1)
    }
})();