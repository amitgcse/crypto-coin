const sha256 = require('sha256')
const uuid = require('uuid/v4')

function Blockchain(){
    this.chain = []
    this.pendingTransactions = []
    this.networkNodes = []
    this.currentNodeUrl = process.argv[3]
    this.createNewBlock('000004534fa9ff9921654064671c26875349aca060bfef21d4eb4f6b8b1d76f9', 
                        '000009133fa9ff9921654064671c26875349aca060bfef21d7eb4f6b8b1d76e9', 
                        123456)
}

Blockchain.prototype.createNewBlock = function(hash, prevHash, nonce){
    const newBlock = {
        index : this.chain.length + 1,
        timestamp : Date.now(),
        transactions : this.pendingTransactions,
        hash : hash,
        previousBlockHash : prevHash,
        nonce : nonce,
        numberOfTransactions: this.pendingTransactions.length
    };
    this.chain.push(newBlock);
    this.pendingTransactions = []
    return newBlock;
}

Blockchain.prototype.createNewTransaction = function(senderId, recipientId, amount){
    const newTransaction = {
        sender: senderId,
        recipient: recipientId,
        amount: amount,
        transactionId : uuid().split('-').join(''),
        timestamp: Date.now()

    }
    this.pendingTransactions.push(newTransaction)
    return newTransaction
}

Blockchain.prototype.hashBlock = function(previousBlockhash, nonce, currentBlockData){
    const data = previousBlockhash + nonce.toString() + JSON.stringify(currentBlockData)
    const hash = sha256(data)
    return hash
}

Blockchain.prototype.proofOfWork = function(previousBlockhash, currentBlockData){
    let nonce = 0
    let hash = this.hashBlock(previousBlockhash, nonce, currentBlockData)
    while(hash.substring(0,3) != '000'){
        nonce++
        hash = this.hashBlock(previousBlockhash, nonce, currentBlockData)
    }
    return nonce
}

Blockchain.prototype.addTransactionToPendingTransactions = function(newTxn){
    this.pendingTransactions.push(newTxn)
    return this.chain.length+1
}

Blockchain.prototype.getLastBlock = function(){
    return this.chain[this.chain.length-1]
}

Blockchain.prototype.getPendingTransactions = function(){
    return this.pendingTransactions
}

Blockchain.prototype.addNetworkNode = function(node){
    return this.networkNodes.push(node)
}


Blockchain.prototype.chainIsValid = function(blockchain) {
    let validChain = true;
    
    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock.nonce === 123456;
    const correctPreviousBlockHash = genesisBlock.previousBlockHash === '000009133fa9ff9921654064671c26875349aca060bfef21d7eb4f6b8b1d76e9'
    const correctHash = genesisBlock.hash === '000004534fa9ff9921654064671c26875349aca060bfef21d4eb4f6b8b1d76f9';
    const correctTransactions = genesisBlock.transactions.length === 0;
    
    if (!(correctNonce && correctPreviousBlockHash && correctHash && correctTransactions)) 
        validChain = false;

    for (var i = 1; i < blockchain.length; i++) {
        const currentBlock = blockchain[i];
        const prevBlock = blockchain[i - 1];
        const blockHash = this.hashBlock(
                            prevBlock.hash, 
                            currentBlock.nonce,
                            currentBlock.transactions, 
                            );
        
        if (blockHash.substring(0, 3) !== '000') validChain = false;
            
        if (currentBlock.previousBlockHash !== prevBlock.hash) validChain = false;
        
        if(!validChain) break
    };
    
    return validChain;
    };
    
    
Blockchain.prototype.getBlock = function(blockHash) {
    let correctBlock = null;
    this.chain.every((block,i) => {
        if (block.hash === blockHash){ 
            correctBlock = block;
            return false;
        }
        return true;
    });
    return correctBlock;
};
    
    
Blockchain.prototype.getTransaction = function(transactionId) {
    let correctTransaction = null;
    let correctBlock = null;

    more = true
    this.chain.every(block => {
        block.transactions.every(transaction => {
            if (transaction.transactionId === transactionId) {
                correctTransaction = transaction;
                correctBlock = block;
                more = false
            };
            return more;
        });
        return more;
    });

    return {
        transaction: correctTransaction,
        block: correctBlock
    };
};
    
    
Blockchain.prototype.getAddressData = function(address) {
    const addressTransactions = [];
    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if(transaction.sender === address || transaction.recipient === address) {
                addressTransactions.push(transaction);
            };
        });
    });

    let balance = 0;
    addressTransactions.forEach(transaction => {
        if (transaction.recipient === address) 
            balance += transaction.amount;
        else if (transaction.sender === address) 
            balance -= transaction.amount;
    });

    return {
        addressTransactions: addressTransactions,
        addressBalance: balance
    };
};


module.exports = Blockchain