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

const idToNodeObj = (d) => {
  return {id: d.login}
}

const generateNodesLinksNext = (res, nodes, links, expanded) => {
  // console.log('res',res);
  // console.log(nodes);
  // console.log(links);
  // console.log(expanded);
  // set the new nodes
  // retrieve the new followers we just got
  let newNodes = res.reduce((acc, curr) => {
    return acc.concat(curr.targets);
  }, []);
  // console.log('newNodes', newNodes);
  // union by id
  newNodes = _.unionBy(nodes, newNodes, 'id');
  // console.log(newNodes);

  // update new links
  let newLinks = res.reduce((acc, curr) => {
    return acc.concat(curr.targets.map(({id}) => ({source: curr.id, target: id})));
  }, links);
  // console.log(newLinks);
  // filter out unique links since a -> b but b -> a could be a possiblity
  let uniqLinks = _.uniqWith(newLinks, (a, b) => {
    return (a.source === b.source && a.target === b.target) ||
    (a.source === b.target && a.target === b.source)
  });
  // console.log(uniqLinks);

  // bug: expanded will be out of date because this.getFollowers() - FIXED
  // nextNodes to expand are the followers - expanded nodes
  let nextNodes = res.reduce((acc, curr) => {
    return acc.concat(curr.targets.filter(({id}) => !expanded.has(id)));
  }, []);
  return {newNodes: newNodes, uniqLinks: uniqLinks, nextNodes: nextNodes};
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
      expanded: new Set(),
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
      // in format [{id: "a"}, ...]
      // return format [{id: "abc", targets: [{id: "a"}, {id: "b"}]}]
      let res = await Promise.all(nextToExpand.map(
        async ({id}) => {
          // could also do return this.getFollowers(id);
          let jsonArr = await this.getFollowers(id);
          // have to await again...!!!
          let targets = await jsonArr.map(idToNodeObj);
          // mark as expanded
          expanded.add(id);
          return {id: id, targets: await targets};
        }
      ));

      let {newNodes, uniqLinks, nextNodes} = generateNodesLinksNext(res, nodes, links, expanded);
      this.setState({nodes: newNodes, links: uniqLinks, nextToExpand: nextNodes});
    }
  }

  handleIncrDepth() {
    this.setState(({ depth }, props) => {
      return {depth: depth + 1};
    });
  }

  handleSearch() {
    const value = this.textInput.current.value;
    this.setState({depth: 0, nodes: [], links: [], nextToExpand: [], expanded: new Set()});
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
      })
      .then(githubID => {
        this.getFollowers(githubID)
          .then(res => {
            let constructedRes = {id: githubID, targets: res.map(({login}) => ({id: login}))};
            this.setState(({nodes, links, expanded}) => {
              // mark as expanded
              expanded.add(githubID);
              let {newNodes, uniqLinks, nextNodes} = generateNodesLinksNext([constructedRes], nodes, links, expanded);
              newNodes = newNodes.concat({id: githubID});
              // need to add myself the first time
              return {nodes: newNodes, links: uniqLinks, nextToExpand: nextNodes};
            });
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
             (this.state.nodes.length > 0 && this.state.depth < 2) && (
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
          <svg width={400} height={400} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet"></svg>
        </div>
      </Container>
      </div>
    );
  }

}

export default App;
