const Xdc3 = require("xdc3");

// Helper function to create a timeout promise
function timeout(ms) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
}

async function getBlockHeight(mn_address) {
    const xdc3 = new Xdc3(new Xdc3.providers.HttpProvider(mn_address))
    const startTime = Date.now() // Record start time

    try {
        const result = await Promise.race([
            (async () => {
                const isSyncing = await xdc3.eth.isSyncing()
                const blockHeight = await xdc3.eth.getBlockNumber()
                return { isSyncing, blockHeight }
            })(),
            timeout(2000) // if a query is taking longer than timeout value in ms, move on to the next
        ])

        const endTime = Date.now() // Record end time
        const duration = (endTime - startTime) / 1000 // Calculate duration in seconds
        //console.log(`Time taken for ${mn_address}: ${duration} seconds`)
        const durationMs = (endTime - startTime)
        return { mn_address, ...result, durationMs }
    } catch (error) {
        const endTime = Date.now() // Record end time
        const duration = (endTime - startTime) / 1000 // Calculate duration in seconds
        //console.error(`Error getting block height for ${mn_address}:`, error.message)
        //console.log(`Time taken for ${mn_address} (with error): ${duration} seconds`)
        const durationMs = (endTime - startTime)
        return { mn_address, isSyncing: true, blockHeight: null, durationMs }
    }
}

async function consensusMedian(sharedArrays) {
    const rpcPool = sharedArrays.support.rpcPool

    // Map over rpcPool to fetch block heights asynchronously
    const blockHeightPromises = rpcPool.map(node => getBlockHeight(node.mn_address))
    const blockHeights = await Promise.all(blockHeightPromises)
    //console.log("Block heights from masternodes:", blockHeights)

    // Update is_syncing, block_height and durationMs in rpcPool
    blockHeights.forEach(result => {
        const node = rpcPool.find(node => node.mn_address === result.mn_address)
        node.is_syncing = result.isSyncing
        node.block_height = result.blockHeight
        node.durationMs = result.durationMs
    })

    // Filter out nodes that are syncing or have errors
    const syncedNodes = blockHeights.filter(node => node.isSyncing === false && node.blockHeight !== null)

    if (syncedNodes.length === 0) {
        console.error("No nodes are synced.")
        return
    }

    // Sort nodes by block height in ascending order for median calculation
    syncedNodes.sort((a, b) => a.blockHeight - b.blockHeight)

    // Determine the median block height
    const medianBlockHeight = syncedNodes[Math.floor(syncedNodes.length / 2)].blockHeight

    // Include nodes with block height equal to or greater than the median block height
    const consensusNodes = syncedNodes.filter(node => node.blockHeight >= medianBlockHeight)

    // Normalize block height and duration
    const maxBlockHeight = Math.max(...consensusNodes.map(node => node.blockHeight))
    const minBlockHeight = Math.min(...consensusNodes.map(node => node.blockHeight))
    const maxDuration = Math.max(...consensusNodes.map(node => node.durationMs))
    const minDuration = Math.min(...consensusNodes.map(node => node.durationMs))

    consensusNodes.forEach(node => {
        if (maxBlockHeight === minBlockHeight) {
            // takes this criteria out of calculation in event all consensus block heights are the same
            node.normalizedBlockHeight = 0
        } else {
            node.normalizedBlockHeight = (node.blockHeight - minBlockHeight) / (maxBlockHeight - minBlockHeight)
        }
        node.normalizedDuration = (node.durationMs - minDuration) / (maxDuration - minDuration)
        // Calculate composite score (33% median block height, 67% duration)
        node.compositeScore = 0.33 * node.normalizedBlockHeight + 0.67 * (1 - node.normalizedDuration) // Invert duration score

        const rpcNode = rpcPool.find(rpcNode => rpcNode.mn_address === node.mn_address)
        rpcNode.composite_score = node.compositeScore
    })

    // Sort consensusNodes by composite score in descending order
    consensusNodes.sort((a, b) => b.compositeScore - a.compositeScore)

    // Assign unique ranks based on composite score
    let rank = 1
    consensusNodes.forEach(node => {
        rpcPool.find(rpcNode => rpcNode.mn_address === node.mn_address).rank = rank++
    })

    //console.log("Consensus block height based on median:", medianBlockHeight)
    //console.log("Nodes in consensus (including higher block nodes):", consensusNodes)

    const bestRpc = rpcPool.find(node => node.rank === 1)
    //console.log(bestRpc.mn_address)
    return(bestRpc.mn_address)
}

module.exports = {
    consensusMedian
}
