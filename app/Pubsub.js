const redis = require('redis');

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION_POOL: 'TRANSACTION_POOL'
};

/* Class: PubSub
 * ___________________
 * Description:
 *  - each node inherits instance of PubSub class
 *  - handles functionality regarding broadcasting and receiving data to channels
 */
class PubSub {
    
    /* Function: constructor
     * ______________________
     * Description:
     *  - creates publisher and subscriber clients for node
     *  - subscribes subscriber client to channels
     *  - when message broadcast to subscriber channel, handleMessage called
     */
    constructor({ blockchain, transactionPool, redisUrl }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;

        this.publisher = redis.createClient(redisUrl);
        this.subscriber = redis.createClient(redisUrl);
        
        this.subscribeToChannels();

        this.subscriber.on('message', 
            (channel, message) =>  {this.handleMessage(channel, message)}
        );
    }

    /* Function: handleMessage
     * ________________________
     * Description:
     *  - logs new message broadcast to channel
     *  - if channel is BLOCKCHAIN, node validates incoming chain, replaces its chain with 
     *    broadcasted one (if chain is valid) and clears its transaction pool of any transactions 
     *    already in blockchain
     *  - if channel is TRANSACTION_POOL, new transaction is added to node's pool
     */
    handleMessage(channel, message) {
        console.log(`Message received. Channel: ${channel}. Message: ${message}.`);

        const parsedMessage = JSON.parse(message);

        switch(channel) {
            case CHANNELS.BLOCKCHAIN:
                this.blockchain.replaceChain(parsedMessage, true, () => {
                    this.transactionPool.clearBlockchainTransactions({
                        chain: parsedMessage
                    });
                });
                break;
            case CHANNELS.TRANSACTION_POOL:
                this.transactionPool.setTransaction(parsedMessage);
                break;
            default:
                return;
        }
    }

    /* Function: subscribeToChannels
     * ______________________________
     * Description:
     *  - subscribes node's subscriber object to appropriate channels
     */
    subscribeToChannels() {
        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });
    }

   /* Function: publish
    * __________________
    * Description:
    *  - publishes message to channel
    *  - unsubscribes and resubscribes to channel to avoid redundant self-received message
    */
    publish({ channel, message }) {
        this.subscriber.unsubscribe(channel, () => {
            this.publisher.publish(channel, message, () => {
                this.subscriber.subscribe(channel);
            });
        });
    }

   /* Function: broadcastChain
    * _________________________
    * Description:
    *  - node publishes its own local blockchain to BLOCKCHAIN channel
    */
    broadcastChain() {
        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify(this.blockchain.chain)
        });
    }

   /* Function: broadcastTransaction
    * _______________________________
    * Description:
    *  - publishes new transaction to TRANSACTION_POOL channel
    */
    broadcastTransaction(transaction) {
        this.publish({
            channel: CHANNELS.TRANSACTION_POOL,
            message: JSON.stringify(transaction)
        });
    }
}
module.exports = PubSub;