const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const Blockchain = require('./blockchain/Blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet/wallet');
const TransactionMiner = require('./app/transaction-miner');

const app = express();
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubsub = new PubSub({ blockchain, transactionPool });
const transactionMiner = new TransactionMiner({ blockchain, transactionPool, wallet, pubsub });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/dist'))); //specifies where to look for static files

const DEFAULT_PORT = 3000;
const ROOT_NODE_ADD = `http://localhost:${DEFAULT_PORT}`;

/* Route: /api/blocks
 * ___________________
 * Description:
 *  - get request returns blockchain for node in reverse
 */
app.get('/api/blocks', (req, res) => {
    res.json(blockchain.chain.slice().reverse());
});

/* Route: /api/mine
 * _________________
 * Description:
 *  - gets data from request body
 *  - attempts to mine new block containing data
 *  - broadcasts updated blockchain to network
 */
app.post('/api/mine', (req, res) => {
    const { data } = req.body;

    blockchain.addBlock({ data });
    pubsub.broadcastChain();

    res.redirect('/api/blocks');
});

/* Route: /api/add-transact
 * ________________________
 * Description: 
 *  - adds OR updates transaction in the transaction pool
 *  - checks if transaction pool already contains transaction by given node (using senderAddress)
 *      - if yes, a the pre-existing transaction is updated, otherwise a new one is created
 *  - if transaction was successfully added/updated, it is updated in the transactionMap
 *  - the transaction is then broadcast to TRANSACTION_POOL channel and returned as response
 */
app.post('/api/add-transact', (req, res) => {
    const { amount, recipient } = req.body;

    let transaction = transactionPool.existingTransaction({ senderAddress: wallet.publicKey });
    try {
        if(transaction) {
            transaction.update({ senderWallet: wallet, recipient, amount });
        } else {
            // pass in chain to have wallet balance be recalculate from most recent output
            transaction = wallet.createTransaction({ 
                amount, 
                recipient, 
                chain: blockchain.chain 
            });
        }
    } catch(error) {
        return res.status(400).json({ type: 'error', message: error.message });
    }

    transactionPool.setTransaction(transaction);
    pubsub.broadcastTransaction(transaction);

    res.json({ type: 'success', transaction });
});

/* Route: /api/get-transact-pool-map
 * __________________________________
 * Description:
 *  - returns node's transactionPool's transactionMap as response
 */
app.get('/api/get-transact-pool-map', (req, res) => {
    res.json(transactionPool.transactionMap);
});

/* Route: /api/mine-transactions
 * _____________________________
 * Description:
 *  - calls for node to mineTransactions using local transaction pool
 *  - redirects to /api/blocks and displays blockchain
 */
app.get('/api/mine-transactions', (req, res) => {
    transactionMiner.mineTransactions();
    res.redirect('/api/blocks');
});

/* Route: /api/get-wallet-info
 * ____________________________
 * Description:
 *  - returns address and balance of node's wallet
 */
app.get('/api/get-wallet-info', (req, res) => {
    const address = wallet.publicKey;
    res.json({
        address,
        balance: Wallet.calculateBalance({ chain: blockchain.chain, address })
    });
});

/* Route: /api/known-addresses
 * ___________________________
 * Description:
 *  - returns all unique addresses with transactions in the blockchain
 *  - loops through all blocks and all transactions and adds unique addresses
 */
app.get('/api/known-addresses', (req, res) => {
    const addressMap = {};

    for(let block of blockchain.chain) {
        for (let transaction of block.data) {
            const recipient = Object.keys(transaction.outputMap);

            recipient.forEach(recipient => addressMap[recipient] = recipient );
        }
    }
    res.json(Object.keys(addressMap));
});

/* Route: *
 * _________
 * Description:
 *  - serves up index.html file for any route other than one's already specified
 */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

/* Function: syncChains
 * ____________________
 * Description:
 *  - makes get request for root node's blockchain
 *  - attempts to replace peer chain with root chain
 */
const syncChains = () => {
    request({ url: `${ROOT_NODE_ADD}/api/blocks` }, (error, response, body) => {
        if(!error && response.statusCode === 200) {
            const rootChain = JSON.parse(body);

            console.log('Sync chain replaces current chain with:', rootChain);
            blockchain.replaceChain(rootChain);
        }
    });
};

/* Function: syncPoolMaps
 * ______________________
 * Description:
 *  - makes get request for root node's transactionPoolMap
 *  - attempts to replace peer transactionPoolMap with root pool map
 */
const syncPoolMaps = () => {
    request({ url: `${ROOT_NODE_ADD}/api/get-transact-pool-map` }, (error, response, body) => {
        if(!error && response.statusCode === 200) {
            const rootPoolMap = JSON.parse(body);

            console.log('syncPoolMaps updates current pool map with:', rootPoolMap);
            transactionPool.setMap(rootPoolMap);
        }
    });
};


// ADDING SEED DATA FOR DEV TESTING
// ______________________________________________________________
const walletFoo = new Wallet();
const walletBar = new Wallet();

const generateTransaction = ({ wallet, recipient, amount }) => {
    const transaction = wallet.createTransaction({ 
        amount, 
        recipient, 
        chain: blockchain.chain 
    });

    transactionPool.setTransaction(transaction);
};

const walletAction = () => generateTransaction({ wallet: wallet, recipient: walletFoo.publicKey, amount: 5 });
const walletFooAction = () => generateTransaction({ wallet: walletFoo, recipient: walletBar.publicKey, amount: 10 });
const walletBarAction = () => generateTransaction({ wallet: walletBar, recipient: wallet.publicKey, amount: 15 });

for(let i = 0; i < 10; i++) {
    if(i % 3 === 0) {
        walletAction();
        walletFooAction();
    } else if(i % 3 === 1) {
        walletFooAction();
        walletBarAction();
    } else {
        walletBarAction();
        walletAction();
    }

    transactionMiner.mineTransactions();
}
// ______________________________________________________________


// generates peer port based on default port number
let PEER_PORT;
if(process.env.GENERATE_PEER_PORT === 'true') {
    PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}

// listen at appropriate port, sync chain and transaction pool map with root if not root node
const PORT = PEER_PORT || DEFAULT_PORT;
app.listen(PORT, () => {
    console.log(`listening at localhost: ${PORT}`);
    
    if(PORT !== DEFAULT_PORT) {
        syncChains();
        syncPoolMaps();
    }
});