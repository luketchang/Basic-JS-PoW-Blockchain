import React from 'react';

/* Component: Transaction
 * ______________
 * Summary:
 *  - returns a set of transactions to be displayed in block
 *  - receives one or more transactions as prop
 *  - lists input info and maps through/displays output info
 */
const Transaction = ({ transaction }) => {
    const { input, outputMap } = transaction;
    const recipients = Object.keys(outputMap);

    return (
        <div>  
            <div>From: {`${input.address.substring(0,20)}...`} | Total Amount: {input.amount}</div>
            {
                recipients.map(recipient => (
                    <div key={recipient}>
                        To: {`${recipient.substring(0,20)}...`} | Amount: {outputMap[recipient]}
                    </div>
                ))
            }
        </div>
    );
}; 

export default Transaction;