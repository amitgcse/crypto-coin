const Blockchain = require('./blockchain')
const mycoin = new Blockchain
// const uuid = require('uuid/v4')


// blockData = mycoin.getPendingTransactions()
// prevHash = mycoin.getLastBlock().hash
// nonce = mycoin.proofOfWork(prevHash, blockData)
// hash = mycoin.hashBlock(prevHash, nonce, blockData)
// // newBlock = mycoin.createNewBlock(hash, prevHash, nonce)

// console.log(prevHash);
// console.log(nonce);
// console.log(blockData);



// console.log(hash)

// console.log(mycoin.hashBlock('000004534fa9ff9921654064671c26875349aca060bfef21d4eb4f6b8b1d76f9',831, []));

// console.log(uuid())
console.log(mycoin.chain[0].previousBlockHash === '000009133fa9ff9921654064671c26875349aca060bfef21d7eb4f6b8b1d76e9')