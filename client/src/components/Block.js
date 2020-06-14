import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import Transaction from './Transaction';

/* Component: Block
 * _________________
 * Summary:
 *  - displays hash, timestamp, and transaction data for each block
 *  - displayTransactions boolean false by default but toggled by show more/less button (toggleTransaction)
 *  - get displayTransactions gets block data:
 *      - if displayTransactions is true, function returns block data broken down using Transaction component
 *      - otherwise, shortened substring versions shown (just plain text)
 */
class Block extends Component {
    state = { displayTransactions: false };

    toggleTransaction = () => {
        this.setState({ displayTransactions: !this.state.displayTransactions });
    }

    get displayTransactions() {
        const { data } = this.props.block;
        const stringifiedData = JSON.stringify(data);
        const dataDisplay = stringifiedData.length > 35 ?
            `${stringifiedData.substring(0,35)}...` :
            stringifiedData;

        if(this.state.displayTransactions) {
            return (
                <div>
                    <div>
                        {
                            data.map(transaction => (
                                <div key={transaction.id}>
                                <hr />
                                    <Transaction className='Transaction' transaction={transaction}/>
                                </div>
                            ))
                        }
                    </div>
                    <Button bsSize="small" onClick={this.toggleTransaction}>
                        Show Less
                    </Button>
                </div>
            );
        }

        return (
            <div>
                <div>Data: {dataDisplay}</div>
                <Button bsSize="small" onClick={this.toggleTransaction}>
                    Show More
                </Button>
            </div>
        );
    }

    render() {
        const { timestamp, hash } = this.props.block;
        const hashDisplay = `${hash.substring(0, 15)}...`;

        return (
            <div className='Block'>
                <div>Hash: {hashDisplay}</div>
                <div>Timestamp: {new Date(timestamp).toLocaleString()}</div>
                <div>Data: {this.displayTransactions}</div>
            </div>
        );
    }
}

export default Block;