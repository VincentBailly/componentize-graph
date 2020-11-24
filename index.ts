type Graph = { nodes: string[], links: { source: string, target: string }[] };
type RegularTree = { node: string, children: Tree[], type: "regular" };
type BackReference = { node: string, type: "back_reference" };
type Tree = RegularTree | BackReference;

import * as fs from "fs";
import * as path from "path";

const scc: (graph: number[][]) => { components: string[][] } = require("strongly-connected-components");

const graph: Graph = JSON.parse(fs.readFileSync(path.join(process.cwd(), "resolved_graph.json")).toString());

const nodes = graph.nodes;
const nodeToIndex = new Map<string, number>();
nodes.forEach((n, i) => nodeToIndex.set(n, i));

const gr: number[][] = nodes.map(() => []);
graph.links.forEach(link => {
  const targetIndex = nodeToIndex.get(link.target);
  const sourceTarget = nodeToIndex.get(link.source);
  gr[sourceTarget].push(targetIndex);
})

const components = scc(gr).components.map(c => c.map(i => nodes[i]));

console.log(JSON.stringify(components, undefined, 2));
