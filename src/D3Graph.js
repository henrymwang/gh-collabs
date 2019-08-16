import React, { Component } from 'react';
import * as d3 from 'd3';
import * as _ from 'lodash';
import { schemeCategory10 } from 'd3-scale-chromatic';


class D3Graph extends Component {
  constructor(props) {
    super(props);
    this.state = {
      svg: ''
    }
  }
  // first time
  componentDidMount() {
    console.log(this.props.nodes);
    console.log(this.props.links);
    this.drawChart();
  }
  // update
  componentDidUpdate(prevProps, prevState) {
    if (!_.isEqual(prevProps.nodes, this.props.nodes) || !_.isEqual(prevProps.links, this.props.links)) {
      this.clear();
      this.drawChart();
    }
  }

  clear() {
    if (this.state.svg) {
      this.state.svg.remove();
    }
  }

  drawChart(c) {
    const w = 800, h = 800;
    const color = schemeCategory10;
    const svg = d3.select('#svg-container')
    .append('svg')
    .attr('width', w)
    .attr('height', h);
    // var simulation = d3.forceSimulation()
    //     .force("x", d3.forceX(w/2).strength(0.4))
    //     .force("y", d3.forceY(h/2).strength(0.6))
    //     .force("link", d3.forceLink().id((d) => d.id)) // specify id is the link variable
    //     .force("charge", d3.forceManyBody()) // // nodes repel from each other, preventing overlap
    //     .force("center", d3.forceCenter(w / 2, h / 2)); // pulls nodes to center

    var simulation = d3.forceSimulation()
        .force("x",d3.forceX(w/2).strength(0.4))
        .force("y",d3.forceY(h/2).strength(0.6))
        .force("charge",d3.forceManyBody().strength(-1000))
        .force("link", d3.forceLink().id(d =>  d.id ))
        .force("collide",d3.forceCollide().radius(d => d.r * 10))
    var link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(this.props.links)
      .enter().append("line")
        .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

    var node = svg.append("g")
        .attr("class", "nodes")
      .selectAll("g")
      .data(this.props.nodes)
      .enter().append("g")

    var circles = node.append("circle")
        .attr("r", 5)
        .attr("fill", function(d) { return 'green';/*color(d.group);*/ })
        // .call(d3.drag()
        //     .on("start", dragstarted)
        //     .on("drag", dragged)
        //     .on("end", dragended));

    var labels = node.append('text')
      .text(d => d.id)
      .attr('x', 6)
      .attr('y', 3);

    const ticked = () => {
      link
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node
          .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
          })
    };

    simulation
        .nodes(this.props.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(this.props.links);

    simulation.on('tick', ticked);
    simulation.alpha(1).restart();

    // add svg to state
    this.setState({svg: svg});
  }

  render() {
    return (
      <div id={'#something'}>
      </div>
    );
  }
}

export default D3Graph;
