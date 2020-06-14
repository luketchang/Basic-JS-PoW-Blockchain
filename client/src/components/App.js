import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import BlockList from './BlockList';
import logo from '../assets/ethereum.png';

/* Component: App
 * ______________
 * Summary:
 *  - loads logo and wallet info
 *  - makes fetch request to get wallet info
 *  - contains links to Blocks, Conduct Transaction, and Transaction Pool pages
 */

class App extends Component {
    state = { walletInfo: {} };

    componentDidMount() {
        fetch(`${document.location.origin}/api/get-wallet-info`)
            .then(response => response.json())
            .then(json => this.setState({ walletInfo: json }));
    }

    render() {
        const { address, balance } = this.state.walletInfo;

        return (
            <div className='App'>
                <img className='logo' src={logo}></img>
                <br />

                <div>Welcome to the blockchain...</div>
                <br />

                <div><Link to='/blocks'>Blocks</Link></div>
                <div><Link to='/conduct-transaction'>Conduct Transaction</Link></div>
                <div><Link to='/transaction-pool'>Transaction Pool</Link></div>
                <br />

                <div className='walletInfo'>
                    <div>Address: {address}</div>
                    <div>Balance: {balance}</div>
                </div>
                <br />
            </div>
        )
    }
}

export default App;