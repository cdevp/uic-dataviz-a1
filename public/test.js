
const border = 1;
const textSize = 20;
const width = 1000;
const textLeft = 40;
const marginLeft = 10;
const marginRight = 10;
const margintop = 10;
const legendHeight = 5;
const legendMargin = 5;
const legendWidth = width / 4;
const w = width - marginLeft - marginRight;
var xScale, yScale;
var minTemp = 0;
var maxTemp = 0;
var zoomLevel = 0;
var freq = 5;
var smallest = 20;
var largest = 30;
const height = (largest + border) * 8;
const brushheight = (largest + border) * 2;
const linechartheight = height / 1.5;
var maxtx = 0;
var grad;
var categories = 0;
var labeldata = [];
var tempdata = [];
var squareSize = 0;
var legendWhitespace = 100;
var rightWhitespace = 50;
var colorlegendWhitespace = 10;
var rows = 1;
var origdata = {};
var hm;
var botrow;
var leftcol;
var dragdx = 0;
var dragspeed = 15;
var xaxis, yaxis;
var xrange = [legendWhitespace, width - rightWhitespace];
var linedata = [];
var viewablesquares = 0;
var lintohm = 0;
var brushmaxx = 0;
var brush;
var tickgap;
var defaultSelection;
var pointsAprox; 

d3.select("#d3-chart")
  .attr("width", "100%");
d3.select("#linebrush")
const svg = d3.select("#svg-chart")
  .attr("viewBox", [0,0,width,height + colorlegendWhitespace + legendHeight + legendMargin + 20])
const svgbrush = d3.select("#brush-chart")
  .attr("viewBox", [0,0,width,linechartheight]);

svg.append("svg")
  .attr("id", "ylabels")
  .attr("x", 0)
  .attr("y", margintop)
  .attr("height", height - margintop)
  .attr("width", legendWhitespace)

svg.append("svg")
  .attr("id", "rightmargin")
  .attr("x", width - rightWhitespace)
  .attr("y", margintop - 1)
  .attr("height", height - margintop + 1)
  .attr("width", rightWhitespace)

const rightmargin = svg.select("#rightmargin");
rightmargin.append("rect")
  .attr("height", height)
  .attr("width", rightWhitespace)
  .attr("fill", "white")

svg.append("rect")
  .attr("id", "leftmargin")
  .attr("x", 0)
  .attr("y", margintop)
  .attr("height", height - margintop)
  .attr("width", legendWhitespace)
  .attr("fill", "white")

const linearGradient = svg.append("defs").append("linearGradient")
  .attr("id", "lg")
  .attr("x1", "0")
  .attr("x2", "0")
  .attr("y1", "1")
  .attr("y2", "0");

const gradientcolors = ["#0a1423","#28518d","#81c6df","#b4e0f8","#fff7b9",
        "#ffdc72","#ff8454","#ff7a05","#ff0004","#900000"];

const ylabels = d3.select("#ylabels");

async function loadData() {
  var temps = [];
  await d3.json("public/data/test.json").then((data) => {
    for (var i = 0; i < data.length; i++) {
      var vals = Object.values(data[i]);
      temps.push(vals[7]);
      temps.push(vals[8]);
      temps.push(vals[9]);
      temps.push(vals[10]);
      temps.push(vals[11]);
      temps.push(vals[12]);
      temps.push(vals[13]);
      temps.push(vals[14]);
    }
    minTemp = d3.quantile(temps, 0);
    maxTemp = d3.quantile(temps, 1);
    grad = d3.scaleLinear()
      .domain([minTemp,-80,-40,-10,0,10,40,80,110,maxTemp])
      .range(gradientcolors);
    console.log(grad.domain());
    origdata = data.filter(function (d) {
      if (((d.Year - 1880) % freq == 0) || d.Year == 2014) {
        return d;
      }
    });
    origdata = data;
    xaxis = d3.map(data, (d) => d.Year);
    zoomUpdate(origdata);
    generateChart(origdata);
    lineChart(origdata);
    svgbrush.select("#brush")
      .call(brush)
      .call(brush.move, defaultSelection)
      .call(zoomer)
        .on("wheel.zoom", null)
        .on("wheel", pan)
      .select(".overlay")
        .on("mousedown touchstart", (event) => {event.stopImmediatePropagation(), brushclick(event)}, true)
        .on("mousemove", brushhover)
    genGradientLegend();
  }).catch((error) => {console.log(error);})
}

function findPoint(px, row) {
  console.log("find point")
  var sel = document.getElementById(`line-${row}`);
  var pathLength = sel.getTotalLength();
  var bounds = [0, pathLength];
  var precision = 0.02;
  var dist = 0;
  var op = sel.getPointAtLength((bounds[1] - bounds[0]) / 2 + bounds[0]);
  for (i = 0; i < 30; i++) {
    if (Math.abs(px - op.x) < 0.02) {
      return op.y;
    }
    else if (px < op.x) {
      bounds = [bounds[0], bounds[0] + (bounds[1] - bounds[0]) / 2];
      op = sel.getPointAtLength((bounds[1] - bounds[0]) / 2 + bounds[0]);
    }
    else if (px > op.x) {
      bounds = [(bounds[1] - bounds[0]) / 2 + bounds[0], bounds[1]];
      op = sel.getPointAtLength((bounds[1] - bounds[0]) / 2 + bounds[0]);
    }
  }
}


function brushhover(event) {
  var p = new DOMPoint(event.clientX, event.clientY);
  var s = document.getElementById("brush-chart");
  var coords = p.matrixTransform(s.getScreenCTM().inverse());
  var yr = xScale.invert(coords.x) + 0.01;
  if (yr >= Math.ceil(yr) - 0.01) yr = Math.ceil(yr);
  else yr = Math.floor(yr);
  var min = 999999;
  var minr = 0;
  var yp;
  for (j = 0; j < rows; j++) {
//    console.log("year: " + yr + "|temp: " + linedata[i][yr - 1880].temp);
    var temp = findPoint(coords.x, j);     
    console.log(`testing: ${temp}, row: ${j}`) 
    if (Math.abs(temp - coords.y) < min) {
      min = Math.abs(temp - coords.y);
      minr = j;
      yp = temp;
    }
  }

  console.log(`mouse-coords: ${coords.y}, ypos: ${yp}, row: ${minr}`);
  svgbrush.select(`#circle-${minr}`)
    .attr("r", 2)
    .attr("cx", coords.x)
    .attr("cy", yp)
    .attr("fill", "purple")
}

//TODO: PONER EL CIRCULO Y VINCULARLO A UN ARRAY CON X Y QUE LUEGO CAMBIA CUANDO SE USE LA FUNCION. USANDO JOIN ENTER
function brushclick(event) {
  console.log("clicked on rush");
  var p = new DOMPoint(event.layerX, event.layerY);
  var s = document.getElementById("brush-chart");
  var coords = p.matrixTransform(s.getScreenCTM().inverse());
  var brushw = parseFloat(svgbrush.select(".selection").attr("width"));
  var overw = parseFloat(svgbrush.select(".overlay").attr("width"));
  console.log(event);
  if (event.buttons != 1) return;
  if (coords.x + brushw > overw + legendWhitespace) {
    heatsvg.attr("x", -(overw - brushw) * lintohm);
    svgbrush.select("#brush")
      .call(brush.move, [overw - brushw + legendWhitespace, legendWhitespace + overw]);
  }
  else {
    console.log(coords);
    heatsvg.attr("x", -(brushw - 100) * lintohm);
    svgbrush.select("#brush")
      .call(brush.move, [coords.x, coords.x + brushw]);
  }
}

const heatsvg = svg.append("svg") // generates the svg container for the heatmap 
  .attr("id", "hmsvg")
  .attr("cursor", "grab")
  .attr("y", margintop)
  .attr("height", height - margintop)
  .attr("width", width);

heatsvg.attr("x", 0);
var zoomer = d3.zoom()
  .extent([[0,0], [width,height - margintop]])
  .on("zoom", zoomed);

var hm = d3.select("#hmsvg");
hm.append("g").classed("hmsquares", true); // creates hmsquares group
hm.append("g")
  .classed("squarelbl", true)
  .attr("pointer-events", "none"); // creates group for the hm square labels
hm.append("g")
  .classed("yearlabels", true)
  .attr("pointer-events", "none");
  
function generateChart(d) {
  // update variables dependent on zoom level

  console.log("temp data:");
  console.log(tempdata); 

  const dt = d3.select("#hmsvg").transition().duration(250).ease(d3.easeCubicOut); // .heatmap transition instance definition

  d3.select(".hmsquares").selectAll("rect")
    .data(tempdata)
    .join(
      enter => enter.append("rect")
          .classed("hmsquare", true)
          .attr("hidid", d => d.id)
          .attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("height", squareSize)
          .attr("width", squareSize)
          .attr("fill", grad(-40))
          .on("mouseover", showTemp)
          .on("mouseleave", hideTemp)
        .call(d3.drag()
          .on("start", dragstart)
          .on("drag", dragged)
          .on("end", null))
        .call(zoomer)
          .on("wheel.zoom", null)
          .on("wheel", pan)
        .call (enter => enter.transition(dt)
          .attr("fill", d => grad(d.temp))
          .attr("border", "white")),
      update => update
          .attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("width", squareSize)
          .attr("height", squareSize)
          .attr("fill", grad(-40))
        .call (update => update.transition(dt)
          .attr("fill", d => grad(d.temp))
          .attr("border", "white")),
      exit => exit
        .remove()
    );
  
  d3.select(".squarelbl").selectAll("svg")
    .data(tempdata)
    .join(
      enter => enter.append("svg")
          .attr("id", d => "hmtemp-" + d.id)
          .attr("hidid", d => d.id)
          .attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("height", squareSize)
          .attr("width", squareSize)
          .attr("opacity", "0%")
          .attr("pointer-events", "none")
          .attr("font-size", `${squareSize / 3}px`)
          .append("text")
            .classed("heattext", true)
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("fill", (d) => (parseInt(d.temp) > -15 & parseInt(d.temp) < 15) ? "black" : "white")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("pointer-events", "none")
            .text(d => d.temp),
      update => update
          .attr("id", d => "hmtemp-" + d.id)
          .attr("hidid", d => d.id)
          .attr("x", d => d.x)
          .attr("y", d => d.y)
          .attr("height", squareSize)
          .attr("width", squareSize)
          .attr("font-size", `${squareSize / 3}px`),
     exit => exit
        .remove()
    );

  hm.selectAll(".heattext") // updates text inside heatmap squares
      .data(tempdata)
      .join(
        enter => enter,
        update => update
          .text(d => d.temp),
       exit => exit.remove()); 
  
  var labelheight = ((squareSize + border) * rows) / labeldata.length;

  const ylabt = d3.select("#ylabels").transition().duration(1000);

  ylabels.selectAll("rect")
        .data(labeldata)
        .join(
          enter => enter.append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * squareSize + border * i)
            .attr("height", labelheight)
            .attr("width", legendWhitespace)
            .attr("fill", "white")
            .attr("color", "black"),
          update => update
            .call(update => update.transition(ylabt)
              .ease(d3.easeBounceOut)
              .attr("height", labelheight)
              .attr("y", (d, i) => i * squareSize + border * i)),
          exit => exit.remove());
  ylabels.selectAll("text")
          .data(labeldata)
          .join(
            enter => enter.append("text")
              .attr("x", legendWhitespace / 2)
              .attr("y", (d, i, n) => -(n.length - i) * squareSize)
              .attr("text-anchor", "middle")
              .attr("fill", "black")
              .text(d => d)
              .call(enter => enter.transition(ylabt)
                .ease(d3.easeBounceIn)
                .attr("y", (d, i) => (i * labelheight + border * i + (i + 1) * labelheight + border * (i + 1)) / 2)),
            update => update
              .text("")
              .attr("y", (d, i, n) => -(n.length - i) * squareSize)
              .call(update => update.transition(ylabt)
                .ease(d3.easeBounceOut)
                .attr("y", (d, i) => (i * labelheight + border * i + (i + 1) * labelheight + border * (i + 1)) / 2)
                .text(d => d)),
            exit => exit
              .call(exit => exit.transition(ylabt)
                .ease(d3.easeBounceOut)
                .attr("y", height * 2))
              .remove()
          )

  hm.select(".yearlabels").selectAll(".yearlabel")
    .data(origdata)
    .join(
      enter => enter.append("svg")
      .classed("yearlabel", true)
      .attr("x", (d, i) => (squareSize + border) * i + legendWhitespace)
      .attr("y", (squareSize + border) * rows)
      .attr("height", textSize)
      .attr("width", squareSize)
      .append("text")
      .text(d => d.Year)
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "black"),
      update => update
        .attr("x", (d, i) => (squareSize + border) * i + legendWhitespace)
        .attr("height", textSize)
        .attr("width", squareSize)
        .raise(),
      exit => exit.remove()
    ) 

  d3.select("#leftmargin").raise();
  d3.select("#rightmargin").raise();
  d3.select("#ylabels").raise();
}

function dragstart(event) {
  dragdx = event.sourceEvent.x
  heatsvg.attr("cursor", "grabbing");
}

function dragend() {
  dragdx = 0;
  heatsvg.attr("cursor", "grab");
}

function dragged(event, d) {
  var newx = parseFloat(heatsvg.attr("x")) + (event.sourceEvent.x - dragdx) / dragspeed;
  if (newx > 0) {
    console.log(1);
    heatsvg.attr("x", 0);
  }
  else if (newx < -maxtx) {
    console.log(2);
    heatsvg.attr("x", -maxtx);
  }
  else {
    console.log(3);
    heatsvg.attr("x", newx);
  }
  console.log("drag end");
}

function zoomed() {
  console.log("zooming")
  return;
}
function pan(event) {
  console.log("wheel pan");
  var posx = parseFloat(heatsvg.attr("x")) + parseFloat(d3.select(event.target).attr("x"));
  var yearidx =  Math.floor((parseFloat(d3.select(event.target).attr("x")) - legendWhitespace) / (squareSize + border));
  var left = (event.layerX / squareSize) < 0.5 ? true : false;
  var zoomout = false;
  
  if (event.shiftKey) {
    console.log("zooming with wheel");
    if (event.wheelDeltaY > 0) {
      zoomLevel = Math.min(zoomLevel + 1, 4);
      zoomout = false;
    }
    else {
      zoomLevel = Math.max(0, zoomLevel - 1);
      zoomout = true;
    }
    zoomUpdate(origdata);

    generateChart(origdata) 

    var hypx = 0;
    if (left || zoomout) hypx = posx - (yearidx * (squareSize + border) + legendWhitespace);
    else if (!zoomout) hypx = posx - (yearidx * (squareSize + border) + legendWhitespace) + squareSize;

    console.log("positionining in: " + hypx);
    if (hypx > 0) {
      heatsvg.attr("x", 0);
      svgbrush.select("#brush")
        .call(brush.move, [legendWhitespace, legendWhitespace + viewablesquares * tickgap]);
    }
    else {
      console.log("positioning");
      heatsvg.attr("x", hypx);
      svgbrush.select("#brush")
        .call(brush.move, [-(hypx/lintohm) + legendWhitespace, -(hypx/lintohm) + legendWhitespace + viewablesquares * tickgap]);
    }
  }
  else {
    var newx = parseFloat(heatsvg.attr("x")) + event.wheelDeltaY;
    if (newx > 0) {
      heatsvg.attr("x", 0);
      svgbrush.select("#brush")
        .call(brush.move, [legendWhitespace, legendWhitespace + viewablesquares * tickgap]);
    }
    else if (newx < -maxtx) {
      heatsvg.attr("x", -maxtx);
      svgbrush.select("#brush")
        .call(brush.move, [(maxtx/lintohm) + legendWhitespace, (maxtx/lintohm) + legendWhitespace + viewablesquares * tickgap]);
    }
    else {
      heatsvg.attr("x", newx);
      svgbrush.select("#brush")
        .call(brush.move, [-(newx/lintohm) + legendWhitespace, -(newx/lintohm) + legendWhitespace + viewablesquares * tickgap]);
      console.log(newx/lintohm + legendWhitespace)
    }
  }
}

function zoomStart() {
  heatsvg.attr("cursor", "grabbing"); 
}

function zoomEnd() {
  heatsvg.attr("cursor", "grab");
}

function showTemp() {
  d3.select("#hmtemp-" + d3.select(this).attr("hidid"))
    .transition()
    .ease(d3.easeBounceIn)
    .style("opacity", "100%")
}

function hideTemp() {
  d3.select("#hmtemp-" + d3.select(this).attr("hidid"))
    .transition()
    .ease(d3.easeBounceOut)
    .style("opacity", "0%")
}

function extractLabels(d) {
  switch (zoomLevel) {
    case 0:
      var x = labeldata.length;
      for (i = 1; i < x; i++) {
        labeldata.pop();
      }
      if (labeldata.length == 1) {labeldata[0] = Object.keys(d[0])[1];}
      else labeldata.push(Object.keys(d[0])[1]);
      break;
    case 1:
      var x = labeldata.length;
      for (i = 2; i < x; i++) {
        labeldata.pop();
      }
      var j = 2;
      for (i = 0; i < labeldata.length; i++) {
        labeldata[i] = (Object.keys(d[0])[j++]);
      }
      for (i = labeldata.length; i < 2; i++) {
        labeldata.push(Object.keys(d[0])[j++]);
      }
      break;
    case 2:
      var x = labeldata.length;
      for (i = 4; i < x; i++) {
        labeldata.pop();
      }
      var j = 7;
      for (i = 0; i < labeldata.length; i++) {
        labeldata[i] = (Object.keys(d[0])[j++]);
      }
      for (i = labeldata.length; i < 4; i++) {
        labeldata.push(Object.keys(d[0])[j++]);
      }
      break;
    case 3: 
      var x = labeldata.length;
      for (i = 4; i < x; i++) {
        labeldata.pop();
      }
      var j = 11;
      for (i = 0; i < labeldata.length; i++) {
        labeldata[i] = (Object.keys(d[0])[j++]);
      }
      for (i = labeldata.length; i < 4; i++) {
        labeldata.push(Object.keys(d[0])[j++]);
      }
      break;
    case 4:
      var x = labeldata.length;
      for (i = 8; i < x; i++) {
        labeldata.pop();
      }
      var j = 7;
      for (i = 0; i < labeldata.length; i++) {
        labeldata[i] = (Object.keys(d[0])[j++]);
      }
      for (i = labeldata.length; i < 8; i++) {
        labeldata.push(Object.keys(d[0])[j++]);
      }
    default:
      break;
  }
  return labeldata;
}

function genGradientLegend() {
  var tickp = [];
  const ext = d3.extent(grad.domain());
  const mag = ext[1] - ext[0];
  const gradoffsets = d3.map(grad.domain(), (d) => (d + 80) / 190);
  console.log(gradoffsets);
  linearGradient.selectAll("stop")
    .data(grad.domain().map((x, i, n) => {
        console.log(n.length);
        if ((i > 0) && (i < (n.length - 1))) {
          tickp.push((1 - gradoffsets[i] * 0.8) * (squareSize * rows - 40))
          return {offset: `${10 + 80*i/(n.length - 1)}%`, color: grad(x)};
        }
        else if (i == 0) {
          tickp.push(squareSize * rows);
          return {offset: '0%', color: grad(x)};
        }
        else {
          tickp.push(-1);
          return {offset: "100%", color: grad(x)};
        }
    }
    ))
    .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);
  
  rightmargin.append("svg")
    .attr("id", "color-legend")
    .attr("stroke-width", "0.5px")
    .attr("x", "50%")
    .attr("y", 1)
    .attr("height", squareSize * rows)
    .append("rect")
      .attr("height", squareSize * rows) 
      .attr("width", legendHeight)
      .style("fill", "url(#lg)")

  var l = maxTemp - minTemp;
  console.log(tickp);

  d3.select("#color-legend").append("g")
    .classed("color-legend-labels", true)
    .attr("color", "white")
    .attr("y", 0)
    .call(d3.axisRight(d3.scaleLinear().domain(grad.domain()).range(tickp))
      .tickValues(grad.domain())
      .tickSize(legendHeight))
    .selectAll("text")
      .attr("fill", "black")
  
  d3.select("#color-legend").select(".domain").remove();
}

function zoomUpdate(d) {
  switch (zoomLevel) {
    case 0:
      rows = 1;
      break;
    case 1:
      rows = 2;
      break;
    case 2:
      rows = 4;
      break;
    case 3:
      rows = 4;
      break;
    case 4:
      rows = 8;
      break;
    default:
      rows = 1;
      break;
  }
  squareSize = (height - margintop - border * rows - textSize) / rows;
  viewablesquares = Math.floor((width - legendWhitespace - rightWhitespace) / (squareSize + border));
  console.log("squares in view: " + viewablesquares);
  extractLabels(d);
  extractTemp(d);
  lineDataUpdate();
  lineChart();
  maxtx = (squareSize + border) * origdata.length - width + legendWhitespace + rightWhitespace;
}

svgbrush.append("g")
  .attr("id", "linyaxis")
  .attr("transform", `translate(${legendWhitespace}, 0)`);

svgbrush.append("g")
  .attr("id", "linxaxis")
  .attr("transform", `translate(0, ${linechartheight})`)
 
svgbrush.append("g")
  .attr("id", "linepaths");

svgbrush.append("g")
  .attr("id", "brush");

svgbrush.append("g")
  .attr("id", "highlight-circles");

for (i = 0; i < 8; i++) {
  svgbrush.select("#highlight-circles").append("circle")
    .attr("id", `circle-${i}`);
}

const linecolors = ["#0a1423","#28518d","#266a2c","#ffdc72","#ff8454","#ff7a05","#ff0004","#900000"]
function lineChart() {
  xScale = d3.scaleLinear(d3.extent(xaxis), xrange);
  yScale = d3.scaleLinear(d3.extent(d3.map(tempdata, d => d.temp)), [linechartheight, 0]).nice();
  const linepatht = d3.select("#linepaths").transition().duration(300).ease(d3.easeCubicIn);

  tickgap = (xScale(xScale.ticks()[1]) - xScale(xScale.ticks()[0])) / (xScale.ticks()[1] - xScale.ticks()[0]);
  lintohm = (squareSize + border) / tickgap;
  defaultSelection = [legendWhitespace, legendWhitespace + viewablesquares * tickgap];
  brushmaxx = Math.ceil(legendWhitespace + (origdata.length - 1) * tickgap) + 1;
  brush = d3.brushX()
  .extent([[legendWhitespace, 0], [Math.ceil(legendWhitespace + (origdata.length - 1) * tickgap) + 1, linechartheight]])
  .on("brush", brushmove)
  .on("end", null)
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(d3.format("c"));
  const yAxis = d3.axisLeft(yScale).ticks();
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.temp))
    .curve(d3.curveNatural)

  svgbrush.select("#linxaxis") 
    .call(xAxis);

  svgbrush.select("#linyaxis")
    .call(yAxis);

  svgbrush.select("#linepaths").selectAll("path")
    .data(linedata)
    .join(
      enter => enter
        .append("path")
        .attr("id", (d, i) => `line-${i}`)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", (10 - zoomLevel * 1.2) / 10)
        .call(enter => enter.transition(linepatht)
          .attr("d", (d, i) => line(d))
          .attr("stroke", (d, i) => linecolors[i])),
      update => update
        .attr("stroke", "white")
        .call(update => update.transition(linepatht)
          .attr("d", (d, i) => line(d))
          .attr("stroke", (d, i) => linecolors[i])),
      exit => exit.remove()
    )
}

function brushmove({selection}) {
  var brushx = selection[0] - legendWhitespace;
  var linx = brushx * lintohm;
  
  if ((linx > maxtx) || selection[1] == brushmaxx) linx = maxtx;
  heatsvg.attr("x", -linx);
}

function lineDataUpdate() {
  var l = linedata.length;
  switch (zoomLevel) {
    case 0:
      while (l > 1) {
        linedata.pop();
        l--;
      }
      if (linedata.length == 0) {
        linedata.push(tempdata.filter(({row}) => row === 0));
      }
      else {
        linedata[0] = tempdata.filter(({row}) => row == 0);
      }
      break;
    case 1:
      while (l > 2) {
        linedata.pop();
        l--;
      }
      if (linedata.length == 0) {
        linedata.push(tempdata.filter(({row}) => row === 0));
        linedata.push(tempdata.filter(({row}) => row === 1));
      }
      else {
        for (i = 0; i < l; i++) {
          linedata[i] = tempdata.filter(({row}) => row === i);
        }
        for (i = l; i < 2; i++) {
          linedata.push(tempdata.filter(({row}) => row === i));
        }
      }
    break;
    case 2: 
      while (l > 4) {
        linedata.pop();
        l--;
      }
      if (linedata.length == 0) {
        for (i = 0; i < 4; i++) {
          linedata.push(tempdata.filter(({row}) => row === i));
        }
      }
      else {
        for (i = 0; i < l; i++) {
          linedata[i] = tempdata.filter(({row}) => row === i);
        }
        for (i = l; i < 4; i++) {
          linedata.push(tempdata.filter(({row}) => row === i));
        }
      }
      break;
    case 3:
      while (l > 4) {
        linedata.pop();
        l--;
      }
      if (linedata.length == 0) {
        for (i = 0; i < 4; i++) {
          linedata.push(tempdata.filter(({row}) => row === i));
        }
      }
      else {
        for (i = 0; i < l; i++) {
          linedata[i] = tempdata.filter(({row}) => row === i);
        }
        for (i = l; i < 4; i++) {
          linedata.push(tempdata.filter(({row}) => row === i));
        }
      }
      break;
    case 4:
      while (l > 8) {
        linedata.pop();
        l--;
      }
      if (linedata.length == 0) {
        for (i = 0; i < 8; i++) {
          linedata.push(tempdata.filter(({row}) => row === i));
        }
      }
      else {
        for (i = 0; i < l; i++) {
          linedata[i] = tempdata.filter(({row}) => row === i);
        }
        for (i = l; i < 8; i++) {
          linedata.push(tempdata.filter(({row}) => row === i));
        }
      }
      break;
    default:
      break;
  }
}

function extractTemp(d) {
  var dif = tempdata.length - d.length * rows;
  for (i = 0; i < dif; i++) {
    tempdata.pop();
  }

  /**
   *  if dif < 0 tempdata is not large enough, have to update values of existing data points in tempdata
   *  and add new data points.
   *  if dif >= 0 then tempdata is large enough and only need to update values of existing data points in tempdata
   */

  switch (zoomLevel) {
    case 0:
      for (i = 0; i < tempdata.length; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length; 
        var px = rem * squareSize + border * rem + legendWhitespace;
        tempdata[i].year = d[rem]["Year"];
        tempdata[i].id = i;
        tempdata[i].row = r; 
        tempdata[i].x = px;
        tempdata[i].y = (squareSize + border) * r;
        switch (r) {
          case 0:
            tempdata[i].temp = d[rem]["Glob"];
            break;
        }
      }
      for (i = tempdata.length; i < d.length * rows; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length; 
        var px = rem * squareSize + border * rem + legendWhitespace;
        switch (r) {
          case 0:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["Glob"],
              row: r,
              x: px,
              y: 0
            });
            break;
        }
      }
      break;
    case 1:
      for (i = 0; i < tempdata.length; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length; 
        var px = rem * squareSize + border * rem + legendWhitespace;
        tempdata[i].year = d[rem]["Year"];
        tempdata[i].id = i;
        tempdata[i].row = r; 
        tempdata[i].x = px;
        tempdata[i].y = (squareSize + border) * r;
        switch (r) {
          case 0:
            tempdata[i].temp = d[rem]["NHem"];
            break;
          case 1:
            tempdata[i].temp = d[rem]["SHem"];
            break;
        }
      }
      for (i = tempdata.length; i < d.length * rows; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length; 
        var px = rem * squareSize + border * rem + legendWhitespace;
        switch (r) {
          case 0:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["NHem"],
              row: r,
              x: px,
              y: 0
            });
            break;
          case 1:
            tempdata.push({
               year: d[rem]["Year"],
             id: i,
              temp: d[rem]["SHem"],
              row: r,
              x: px,
              y: squareSize + border
            });
            break;
        }
      }
      break;
    case 2:
      for (i = 0; i < tempdata.length; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length;
        var px = rem * squareSize + border * rem + legendWhitespace;
        tempdata[i].year = d[rem]["Year"];
        tempdata[i].id = i;
        tempdata[i].row = r; 
        tempdata[i].x = px;
        tempdata[i].y = (squareSize + border) * r;
        switch (r) {
          case 0:
            tempdata[i].temp = d[rem]["64N-90N"];
            break;
          case 1:
            tempdata[i].temp = d[rem]["44N-64N"];
            break;
          case 2:
            tempdata[i].temp = d[rem]["24N-44N"];
            break;
          case 3:
            tempdata[i].temp = d[rem]["EQU-24N"];
            break;
        }
      }
      for (i = tempdata.length; i < d.length * rows; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length;
        var px = rem * squareSize + border * rem + legendWhitespace;
        switch (r) {
          case 0:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["64N-90N"],
              row: 0,
              x: px,
              y: 0
            });
            break;
          case 1:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["44N-64N"],
              row: 1,
              x: px,
              y: (squareSize + border)
            });
            break;
          case 2:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["24N-44N"],
              row: 2,
              x: px,
              y: (squareSize + border) * r
            });
            break;
          case 3:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["EQU-24N"],
              row: 3,
              x: px,
              y: (squareSize + border) * r
            });
            break;
        }
      }
      break;
    case 3:
      for (i = 0; i < tempdata.length; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length;
        var px = rem * squareSize + border * rem + legendWhitespace;
        tempdata[i].year = d[rem]["Year"];
        tempdata[i].row = r; 
        tempdata[i].x = px;
        tempdata[i].y = (squareSize + border) * r;
        switch (r) {
          case 0:
            tempdata[i].temp = d[rem]["24S-EQU"];
            break;
          case 1:
            tempdata[i].temp = d[rem]["44S-24S"];
            break;
          case 2:
            tempdata[i].temp = d[rem]["64S-44S"];
            break;
          case 3:
            tempdata[i].temp = d[rem]["90S-64S"];
            break;
        }
      }
      for (i = tempdata.length; i < d.length * rows; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length;
        var px = rem * squareSize + border * rem + legendWhitespace;
        switch (r) {
          case 0:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["24S-EQU"],
              row: r,
              x: px,
              y: 0
            });
            break;
          case 1:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["44S-24S"],
              row: r,
              x: px,
              y: (squareSize + border)
            });
            break;
          case 2:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["64S-44S"],
              row: r,
              x: px,
              y: (squareSize + border) * r
            });
            break;
          case 3:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["90S-64S"],
              row: r,
              x: px,
              y: (squareSize + border) * r
            });
            break;
        }
      }
      break;
    case 4:
      for (i = 0; i < tempdata.length; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length;
        var px = rem * squareSize + border * rem + legendWhitespace;
        tempdata[i].year = d[rem]["Year"];
        tempdata[i].row = r; 
        tempdata[i].x = px;
        tempdata[i].y = (squareSize + border) * r;
        switch (r) {
          case 0:
            tempdata[i].temp = d[rem]["64N-90N"];
            break;
          case 1:
            tempdata[i].temp = d[rem]["44N-64N"];
            break;
          case 2:
            tempdata[i].temp = d[rem]["24N-44N"];
            break;
          case 3:
            tempdata[i].temp = d[rem]["EQU-24N"];
            break;
          case 4:
            tempdata[i].temp = d[rem]["24S-EQU"];
            break;
          case 5:
            tempdata[i].temp = d[rem]["44S-24S"];
            break;
          case 6:
            tempdata[i].temp = d[rem]["64S-44S"];
            break;
          case 7:
            tempdata[i].temp = d[rem]["90S-64S"];
            break;
        }
      }
      for (i = tempdata.length; i < d.length * rows; i++) {
        var r = Math.floor(i / d.length);
        var rem = i % d.length;
        var px = rem * squareSize + border * rem + legendWhitespace;
        switch (r) {
          case 0:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["64N-90N"],
              row: r,
              x: px,
              y: 0
            });
            break;
          case 1:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["44N-64N"],
              row: r,
              x: px,
              y: (squareSize + border)
            });
            break;
          case 2:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["24N-44N"],
              row: r,
              x: px,
              y: (squareSize + border) * r
            });
            break;
          case 3:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["EQU-24N"],
              row: r,
              x: px,
              y: (squareSize + border) * r
            });
            break;
          case 4:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["24S-EQU"],
              row: r,
              x: px,
              y: (squareSize + border) * r
            });
            break;
          case 5:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["44S-24S"],
              row: r,
              x: px,
              y: (squareSize + border) * r
            });
            break;
          case 6:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["64S-44S"],
              row: r,
              x: px,
              y: (squareSize + border) * r
            });
            break;
          case 7:
            tempdata.push({
              year: d[rem]["Year"],
              id: i,
              temp: d[rem]["90S-64S"],
              row: r,
              x: px,
              y: (squareSize + border) * r
            });
            break;
        }
      }
      break;
    default:
      break;
  }

}

loadData();



