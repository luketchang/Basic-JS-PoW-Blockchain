import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Block from './Block';

/* Component: BlockList
 * _____________________
 * Summary:
 *  - loads list of blocks in blockchain
 *  - makes fetch request to get blockchain blocks
 *  - maps through blockchain, creating a Block component for each block
 */
class BlockList extends Component {
    state = { blocks: [] };

    componentDidMount() {
        fetch(`${document.location.origin}/api/blocks`)
            .then(response => response.json())
            .then(json => this.setState({ blocks: json }));
    }

    render() {
        console.log('STATE: ', this.state);

        return (
            <div>
                <div><Link to='/'>Home</Link></div>
                <h3>Blocks</h3>
                {
                    this.state.blocks.map(block => {
                        return (
                            <Block key={block.hash} block={block}/>
                        );
                    })
                }
            </div>
        );
    }
}

export default BlockList;