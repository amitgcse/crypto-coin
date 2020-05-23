const express = require('express')
const bodyParser = require('body-parser')
const rp = require('request-promise')
const uuid = require('uuid/v4')
const Blockchain = require('./blockchain')

const port = process.argv[2]
const coin = new Blockchain()
const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))


app.get('/', (req, res)=>res.send('Node of the miner'))

app.get('/blockchain', (req, res)=>res.send(coin))

app.post('/transaction',(req, res)=>{
    const index = coin.addTransactionToPendingTransactions(req.body)
    res.json({note:`The transaction will be added to block ${index}`})
})

app.post('/transaction/broadcast',(req, res)=>{
    const newTransaction = coin.createNewTransaction(req.body.sender, req.body.recipient, req.body.amount)
    let requestPromise = []
    coin.networkNodes.forEach(node => {
        requestOptions = {
            uri: node + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        }
        requestPromise.push(rp(requestOptions))
    });
    Promise.all(requestPromise)
        .then(()=>res.json({note:`The transaction was broadcasted successfully`}))
    
})


app.get('/mine', (req, res)=>{
    blockData = coin.getPendingTransactions()
    prevHash = coin.getLastBlock().hash
    nonce = coin.proofOfWork(prevHash, blockData)
    hash = coin.hashBlock(prevHash, nonce, blockData)
    newBlock = coin.createNewBlock(hash, prevHash, nonce)
    
    const promiseRequest = []
    coin.networkNodes.forEach(node=>{
        requestOption = {
            uri: node + '/receive-newblock',
            method: 'POST',
            body: {newBlock: newBlock},
            json: true
        }
        promiseRequest.push(rp(requestOption))
    })
    Promise.all(promiseRequest)
        .then(()=>{
            // Reward for Mining            
            return rp({
                uri: coin.currentNodeUrl + '/transaction/broadcast',
                method: 'POST',
                body: {
                    sender:'GOD',
                    recipient: 'SELF_MINER',
                    amount: 12.5,
                    transactionId: uuid().split('-').join(''),
                    timestamp: Date.now()
                },
                json: true
            })
        })
        .then(()=>{res.json({
            note:`Block generated and broadcasted successfully`,
            newBlock:newBlock
        })
    })
})

app.post('/receive-newblock', (req, res)=>{
    newBlock = req.body.newBlock
    lastBlock = coin.getLastBlock()
    const isHashOK = lastBlock.hash === newBlock.previousBlockhash
    const isIndexOK = lastBlock.index === newBlock.index - 1
    // console.log(isHashOK + ', '+isIndexOK);
    
    if(isHashOK && isIndexOK){
        coin.chain.push(newBlock)
        coin.pendingTransactions = []        
        res.json({
            note:`Block accepted.`,
            Block:newBlock
        })
    } else{
        res.json({
            note:`Block Rejected.`,
            Block:newBlock
        })
    }
    
})

app.post('/register',(req, res)=>{
    url = req.body.url
    nodeNotAlreadyPresent = coin.networkNodes.indexOf(url) == -1
    notCorrentNode = url != coin.currentNodeUrl
    if(nodeNotAlreadyPresent && notCorrentNode){
        coin.addNetworkNode(url)
        res.json({note:`Node '${url}' was added successfully.`})
    } else{
        res.json({note:`Node '${url}' is already a miner.`})
    }
})

app.post('/register/broadcast', (req, res)=>{
    const url = req.body.url
    
    // Registration at self chain
    nodeNotAlreadyPresent = coin.networkNodes.indexOf(url) == -1
    notCorrentNode = url != coin.currentNodeUrl
    if(nodeNotAlreadyPresent && notCorrentNode)
        coin.addNetworkNode(url)

    // Send information of requiesting node to all existing nodes
    promiseRequests = []
    coin.networkNodes.forEach(node=>{
        requestOption = {
            uri: node + '/register',
            method: 'POST',
            body: {url: url},
            json: true
        }
        promiseRequests.push(rp(requestOption))
    })

    Promise.all(promiseRequests).then(()=>{
    
        // Send info of all nodes to the requesting node
        requestOption = {
            uri: url + '/register-bulk',
            method: 'POST',
            body: {urls: [...coin.networkNodes, coin.currentNodeUrl]},
            json: true
        }
        return rp(requestOption)
    }).then(data=>{
        res.json({ note: 'New node registered with network successfully.' });
    })
})

app.post('/register-bulk', (req, res)=>{
    const urls = req.body.urls
    urls.forEach(url=>{
        nodeNotAlreadyPresent = coin.networkNodes.indexOf(url) == -1
        notCorrentNode = url !== coin.currentNodeUrl
        if(nodeNotAlreadyPresent && notCorrentNode)
            coin.addNetworkNode(url) 
    })
    res.json({ note: 'Bulk registration successful.' });
})


// consensus
app.get('/consensus', function(req, res) {
    const requestPromises = [];
    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            json: true
        };
        
        requestPromises.push(rp(requestOptions));
    });
    
    Promise.all(requestPromises)
    .then(blockchains => {
        const currentChainLength = coin.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransactions = null;
        blockchains.forEach(blockchain => {
            if (blockchain.chain.length > maxChainLength) {
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            };
        });
    
        console.log(newLongestChain);
        
        console.log('CONDITIONS:'+!!newLongestChain)
        
        if (!!newLongestChain &&  coin.chainIsValid(newLongestChain)) {
            coin.chain = newLongestChain;
            coin.pendingTransactions = newPendingTransactions;
            res.json({
                note: 'This chain has been replaced.',
                chain: coin.chain
            });
        }
        else {
            res.json({
                note: 'Current chain has not been replaced.',
                chain: coin.chain
            });
        }
    });
});
    
    
// get block by blockHash
app.get('/block/:blockHash', function(req, res) {
    const blockHash = req.params.blockHash;
    const correctBlock = coin.getBlock(blockHash);
    res.json({
        block: correctBlock
    });
});
    
    
// get transaction by transactionId
app.get('/transaction/:transactionId', function(req, res) {
    const transactionId = req.params.transactionId;
    const trasactionData = coin.getTransaction(transactionId);
    res.json({
        transaction: trasactionData.transaction,
        block: trasactionData.block
    });
});


// get address by address
app.get('/address/:address', function(req, res) {
    const address = req.params.address;
    const addressData = coin.getAddressData(address);
    res.json({
        addressData: addressData
    });
});
    

app.get('/block-explorer', (req, res)=>{
    res.sendFile('./block-explorer/index.html', {root:__dirname})
})



app.listen(port, ()=>console.log(`Server listening at ${port}`))