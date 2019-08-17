import React, { Component } from 'react';
import * as d3 from 'd3';
import * as _ from 'lodash';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';

const makeZoom = (g) => {
  return d3.zoom().on('zoom', () => {
    g.attr('transform', d3.event.transform);
  })
}
class D3Graph extends Component {
  constructor(props) {
    super(props);
    this.state = {
      restart: () => {}
    }
  }

  componentDidMount() {
    this.draw();
  }

  componentDidUpdate(prevProps, prevState) {
    let { nodes, links } = this.props;
    if (!_.isEqual(prevProps.nodes, nodes) || !_.isEqual(prevProps.links, links)) {
      this.state.restart();
    }
  }

  resetZoom() {
    const svg = d3.select('svg');
    svg.transition().duration(1000).call(makeZoom(svg.select('g')).transform, d3.zoomIdentity);
  }

  //https://bl.ocks.org/mbostock/1095795
  draw() {
    const svg = d3.select('svg').attr('class', 'svg-content'),
    width = +svg.attr('width'),
    height = +svg.attr('height'),
    color = d3.scaleOrdinal(d3.schemeCategory10);

    let restart = () => {
      // Apply the general update pattern to the nodes.
      node = node.data(this.props.nodes, function(d) { return d.id;});
      node.exit().remove();
      // node = node.enter()
      //   .append("circle")
      //   .attr("fill", function(d) { return color(d.id); })
      //   .attr("r", 8)
      //   .merge(node);

      let enter = node.enter().append('g')
        .attr('class', 'node')

      let labels = enter.append('text')
        .attr('x', 6)
        .attr('y', 6)
        .text(d => d.id)
        .attr('fill', 'black')
        .attr('stroke', 'black')
        .attr('stroke-width', 0.25)

      let circles = enter.append('circle')
        .attr('fill', d => color(d.id))
        .attr('r', 5)

      node = node.merge(enter)

      // node = node.merge(labels)
      // node = node.merge(circles)

      // Apply the general update pattern to the links.
      link = link.data(this.props.links);
      link.exit().remove();
      link = link.enter().append("line").merge(link);

      // Update and restart the simulation.
      simulation.nodes(this.props.nodes);
      simulation.force("link").links(this.props.links);
      simulation.alpha(1).restart();
    }

    const ticked = () => {
      // node.attr("cx", function(d) { return d.x; })
      //     .attr("cy", function(d) { return d.y; })

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });


      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
    }

    var simulation = d3.forceSimulation(this.props.nodes)
        .force("charge", d3.forceManyBody().strength(-1000))
        // use named sources and targets by referencing the ID
        .force('link', d3.forceLink(this.props.links).id(d => d.id).distance(50))
        .force("x", d3.forceX(width/2).strength(1))
        .force("y", d3.forceY(height/2).strength(1))
        .alphaTarget(0.01)
        .on("tick", ticked);

    var g = svg.append("g").attr('class', 'everything'),
        link = g.append("g").attr("stroke", "#000").attr("stroke-width", 1.5).selectAll(".link"),
        node = g.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5).selectAll(".node");

    // zoom in for the first time
    svg.call(makeZoom(g));

    restart();

    this.setState({restart: restart});
  }

  render() {
    return (
      <Container>
        <Button onClick={_ => this.resetZoom()}>Reset Zoom</Button>
      </Container>
    );
  }
}

export default D3Graph;
