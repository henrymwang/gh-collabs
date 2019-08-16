import React, { Component } from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import FormControl from 'react-bootstrap/FormControl';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import * as _ from 'lodash';

import D3Graph from './D3Graph';

const base = 'https://api.github.com'

// const depth = 3;

// const graph = {};

const updateNodes = (existingNodes, newIDs) => {
  console.log('newIDs', newIDs);
  let newNodes = newIDs.map(githubID => ({id: githubID}));
  console.log('New', newNodes);
  return _.unionBy([...existingNodes], [...newNodes], 'id');
};

const updateLinks = (existingLinks, res) => {
  let newLinks = res.reduce((acc, curr) => {
    return acc.concat(curr.targets.map(targetID => {
      return {source: curr.id, target: targetID}
    }))
  }, []);

  // links could be duplicated
  let allLinks = _.union(existingLinks, newLinks);

  let uniqLinks = _.uniqWith(allLinks, (a, b) => {
    return a.source === b.source && a.target === b.target
  });

  return uniqLinks;
}

const updateNextToExpand = (expanded, nextToExpand, newNodes) => {
  // let nextNodes = updateNextToExpand(expanded, nextToExpand, nextIDs);
  return _.difference(newNodes.map(d => d.id), nextToExpand, expanded);
}


class App extends Component {
  constructor(props) {
    super(props);
    this.textInput = React.createRef();
    this.state = {
      searchResults: {},
      width: 600,
      height: 400,
      id: 'barchart',
      nodes: [], // {id: "abc"}, must be unique
      links: [], // {source: "abc", target: "def"}
      nextToExpand: [], //["henrymwang"] used to keep track of next nodes to expand
      expanded: [], // ["henrymwang"] TODO: change to hashmap
      depth: 0
    };
  }

  async getUser(value) {
    const resp = await fetch(`${base}/users/${value}`);
    if (resp.status === 200) {
      return await resp.json();
    }
    return Promise.reject(new Error(resp.status));
  }

  async getFollowers(user) {
    const resp = await fetch(`${base}/users/${user}/followers`);
    if (resp.status === 200) {
      return await resp.json();
    }
    return Promise.reject(new Error(resp.status));
  }

  componentDidUpdate = async (prevProps, prevState) => {
    if (prevState.depth !== this.state.depth) {
      // update nodes
      const { nextToExpand, nodes, expanded, links } = this.state;
      console.log('Exp', expanded);

      console.log('NextToExpand', nextToExpand);
      // let nextIDs = nextToExpand.map(node => node.id);
      let res = await Promise.all(nextToExpand.map(
        async id => {
          // could also do return this.getFollowers(id);
          let jsonArr = await this.getFollowers(id);
          let targets = jsonArr.map(json => json.login);
          return {id: id, targets: targets};
        }
      ));

      console.log('Res',res);

      let newIDs = res.reduce((acc, curr) => {
        return acc.concat(curr.targets);
      }, []);
      // console.log(newIDs);
      let newNodes = updateNodes(nodes, newIDs);
      console.log(newNodes);

      let newLinks = updateLinks(links, res);

      // bug: expanded will be out of date because this.getFollowers()
      // updates this.state.expanded
      let nextNodes = updateNextToExpand(expanded, nextToExpand, newNodes);

      console.log('Next Nodes', nextNodes);
      this.setState({nodes: newNodes, links: newLinks, nextToExpand: nextNodes});
    }
  }

  handleIncrDepth() {
    this.setState(({ depth }, props) => {
      return {depth: depth + 1};
    });
  }

  generateNodesLinks(res, githubID) {
    const nodes = res.map(d => ({id: d.login}));
    this.setState(prevState => ({ expanded: [...this.state.expanded, githubID] }));
    this.setState({nextToExpand: [...res].map(d => d.login)});
    const links = res.map(d => ({source: githubID, target: d.login}));
    return [[...nodes], [...links]];
  }

  handleSearch() {
    const value = this.textInput.current.value;
    this.setState({depth: 0});
    this.getUser(value)
      .then(({login, followers, following, avatar_url}) => {
        // destructure obj to access those fields
        let searchResults = {
          githubID: login,
          followers: followers,
          following: following,
          avatarUrl: avatar_url
        };
        this.setState({searchResults: searchResults});
        return searchResults.githubID;
      })
      .catch(err => {
        // TODO: display user not found
        this.setState({searchResults: {}});
        console.log(err);
      })
      .then(githubID => {
        this.getFollowers(githubID)
          .then(res => {
            const [nodes, links] = this.generateNodesLinks(res, githubID);
            console.log(nodes);
            let allNodes = [...nodes];
            allNodes.unshift({id: githubID}); // add myself to front
            this.setState({nodes: allNodes, links: links});
          })
          .catch(err => {
            // TODO: display user not found
            this.setState({searchResults: {}});
            console.log(err);
          });
      })
      ;
  }

  render() {
    let { searchResults } = this.state;
    let githubID = searchResults.githubID;
    let followers = searchResults.followers;
    let following = searchResults.following;
    let avatarUrl = searchResults.avatarUrl;

    let rows;
    if (Object.keys(searchResults).length === 0) {
      rows = (<tr></tr>)
    } else {
      rows = (
        <tr>
          <td>
            <img alt={"avatar of " + githubID} width={50} height={50} src={avatarUrl}>
          </img>
          </td>
          <td>{ githubID }</td>
          <td>{ followers }</td>
          <td>{ following }</td>
        </tr>
      );
    }

    return (
      <div className="App">
      <Container>
        <Row>
          <Col className="d-none d-lg-block"></Col>
          <Col>
            <h3>
              Github Network
            </h3>
            <div>
              <InputGroup className="mb-3">
                <InputGroup.Prepend>
                  <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
                </InputGroup.Prepend>
                <FormControl
                  placeholder="Username"
                  aria-label="Username"
                  aria-describedby="basic-addon1"
                  ref={this.textInput}
                  type="text"
                />
                <InputGroup.Append>
                  <Button variant="outline-secondary" onClick={_ => this.handleSearch()}>Search</Button>
                </InputGroup.Append>
              </InputGroup>
            </div>
          </Col>
          <Col className="d-none d-lg-block"></Col>
        </Row>
        <Row>
          <Col>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Username</th>
                  <th>Followers</th>
                  <th>Following</th>
                </tr>
              </thead>
              <tbody>
                { rows }
              </tbody>
            </Table>
          </Col>
        </Row>
        <Row>
          <D3Graph nodes={this.state.nodes} links={this.state.links}>
          </D3Graph>
        </Row>
        <Row>
          <Col>
          {
             (this.state.nodes.length > 0 && this.state.depth < 3) && (
               <div>
                <Button variant="outline-secondary" onClick={_ => this.handleIncrDepth()}>
                  Increase Depth
                </Button>
                <p>Depth: {this.state.depth}</p>
              </div>
            )
          }

          </Col>
        </Row>
      </Container>
      <Container>
        <div id="svg-container">
        </div>
      </Container>
      </div>
    );
  }

}

export default App;
