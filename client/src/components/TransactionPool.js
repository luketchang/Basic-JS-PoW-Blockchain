import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Transaction from './Transaction';
import { Button } from 'react-bootstrap';
import history from '../history';

const POLL_INTERVAL = 10000;

/* Component: TransactionPool
 * ______________________________
 * Summary:
 *  - shows transaction pool and has button to mine transactions
 *  - gets transaction pool through fetch request to api
 *  - maps through values in transaction pool to display all transactions
 *  - sets interval to request new transaction pool data every 10 seconds
 *  - mine transaction button makes api call and redirects to blocks page if successful
 */
class TransactionPool extends Component {
    state = { transactionPoolMap: {} };

    getTransactionPoolMap = () => {
        fetch(`${document.location.origin}/api/get-transact-pool-map`)
            .then(response => response.json())
            .then(json => this.setState({ transactionPoolMap: json }));
    }

    mineTransactions = () => {
        fetch(`${document.location.origin}/api/mine-transactions`)
            .then(response => {
                if(response.status === 200) {
                    alert('success');
                    history.push('/blocks');
                } else {
                    alert('Mine request did not complete.');
                }
            });
    }

    componentDidMount() {
        this.getTransactionPoolMap();

        this.getPoolInterval = setInterval(
            () => this.getTransactionPoolMap(), POLL_INTERVAL
        );
    }

    componentWillUnmount() {
        clearInterval(this.getPoolInterval);
    }

    render() {
        return (
            <div className='TransactionPool'>
                <div><Link to='/'>Home</Link></div>
                <h3>Transaction Pool</h3>
                {
                    Object.values(this.state.transactionPoolMap).map(transaction => {
                        return (
                            <div key={transaction.id}>
                                <hr />
                                <Transaction className='Transaction' transaction={transaction} />
                            </div>
                        )
                    })
                }
                <hr />
                <Button onClick={this.mineTransactions}>Mine Transactions</Button>
            </div>
        );
    }
}

export default TransactionPool;