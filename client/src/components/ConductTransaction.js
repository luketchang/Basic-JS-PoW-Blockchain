import React, { Component } from 'react';
import { FormGroup, FormControl, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import history from '../history';

/* Component: ConductTransaction
 * ______________________________
 * Summary:
 *  - loads two forms and submission button for creating own transaction
 *  - also displays all addresses who've conducted transaction in blockchain through api/known-addresses
 *  - updates internal recipient and amount state variables based on user typing
 *  - submit button makes POST request to add transaction to transaction pool
 */
class ConductTransaction extends Component {
    state = { recipient: '', amount: 0, knownAddresses: [] };

    componentDidMount() {
        fetch(`${document.location.origin}/api/known-addresses`)
            .then(response => response.json())
            .then(json => this.setState({ knownAddresses: json }));
    }

    updateRecipient = event => {
        this.setState({ recipient: event.target.value });
    }

    updateAmount = event => {
        this.setState({ amount: Number(event.target.value) || 0 })
    }

    conductTransaction = () => {
        const { recipient, amount } = this.state;

        fetch(`${document.location.origin}/api/add-transact`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ recipient, amount })
        }).then(response => response.json())
            .then(json => { alert(json.message || json.type);
            history.push('/transaction-pool')
            });
    }

    render() {
        return (
            <div className='ConductTransaction'>
                <Link to='/'>Home</Link>
                <h3>Conduct Transaction</h3>
                <br />
                <h4>Known Addresses</h4>
                {   
                    this.state.knownAddresses.map(address => (
                        <div key={address}>
                            <div>{address}</div>
                            <br />
                        </div>
                    ))
                }
                <FormGroup>
                    <FormControl
                        input='text'
                        placeholder='recipient'
                        value={this.state.recipient}
                        onChange={this.updateRecipient}
                    />
                </FormGroup>

                <FormGroup>
                    <FormControl
                        input='number'
                        placeholder='amount'
                        value={this.state.amount}
                        onChange={this.updateAmount}
                    />
                </FormGroup>

                <div>
                    <Button onClick={this.conductTransaction}>Submit</Button>
                </div>
            </div>
        );
    }
}

export default ConductTransaction;