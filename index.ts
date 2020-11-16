type Graph = { nodes: string[], links: { source: string, target: string }[] };
type RegularTree = { node: string, children: Tree[], type: "regular" };
type BackReference = { node: string, type: "back_reference" };
type Tree = RegularTree | BackReference;

import * as fs from "fs";
import * as path from "path";

function is_regular(tree: Tree): tree is RegularTree {
  return tree.type === "regular";
}

function union<T>(a: Array<T>, b: Array<T>): Array<T> {
  return a.concat(b.filter(o => !a.includes(o)));
  //return new Set(Array.from(a).concat(Array.from(b)));
}

function substract<T>(a: Array<T>, b: Array<T>): Array<T> {
  return a.filter(o => !b.includes(o));
  //return new Set(Array.from(a).reduce((p, n) => b.has(n) ? p : [...p, n], []));
}

const graph = JSON.parse(fs.readFileSync(path.join(process.cwd(), "resolved_graph.json")).toString());

const memo_bottom: Map<Tree, string[]> = new Map();
function get_bottoms(tree: Tree): string[] {
  if (memo_bottom.has(tree)) {
    return memo_bottom.get(tree);
  }
  if (tree.type === "back_reference") {
    const result = [tree.node];
    memo_bottom.set(tree, result);
    return result;
  } else {
    const result = tree.children.map(c => get_bottoms(c)).reduce((p,n) => union(p,n), []).sort();
    memo_bottom.set(tree, result);
    return result;
  }
}

const memo: Map<string, {bottoms: string[], tree: Tree}[]> = new Map();
function get_dependency_tree(root: string, graph: Graph, visited: Array<string>): Tree {

  if (!memo.has(root)) {
    memo.set(root, []);
  } 

  const memo_result = memo.get(root).filter(o => o.bottoms.every(b => b === root || visited.includes(b)))[0];
  if (memo_result) {
    return memo_result.tree;
  }

  if (visited.includes(root)) {
    return { node: root, type: "back_reference" };
  }
  const updated_visited = union(visited, [root]);
  const direct_dependencies = graph.links.filter(l => l.source === root).map(l => l.target);
  const result: Tree = { node: root, children: direct_dependencies.map(d => get_dependency_tree(d, graph, updated_visited)), type: "regular" };

  const bottoms = get_bottoms(result);
  memo.get(root).push({ bottoms, tree: result });

  return result;
}

function has_back_reference(name: string, tree: Tree): boolean {
  if (tree.type === "back_reference") {
    return tree.node === name;
  }
  return tree.children.some(c => has_back_reference(name, c));
}

function is_cyclical(tree: RegularTree): boolean {
  return tree.children.some(c => has_back_reference(tree.node, c));
}

function keep_back_references(root: string, tree: Tree): Tree | undefined {
  if (!is_regular(tree)) {
    if (root === tree.node) {
      return tree;
    } else {
      return undefined;
    }

  }
  if (!has_back_reference(root, tree)) {
    return undefined;
  }
  return { node: tree.node, children: tree.children.map(c => keep_back_references(root, c)).filter(Boolean), type: "regular" };
}


function get_nodes_in_tree(tree: Tree): Array<string> {
  if (!is_regular(tree)) {
    return new Array();
  } else {
    //return new Set([tree.node, ...tree.children.map(c => get_nodes_in_tree(c)).reduce((p, n) => Array.from(p).concat(Array.from(n)), [])]);
    return union([tree.node], tree.children.map(c => get_nodes_in_tree(c)).reduce((p, n) => union(p, n), []));
  }
}

function get_cycles_from(name: string): Array<string> {
  const dependency_tree = get_dependency_tree(name, graph, new Array());
  const b_is_cyclical = is_regular(dependency_tree) && is_cyclical(dependency_tree);
  if (!b_is_cyclical) {
    return new Array();
  }

  const filtered_tree = is_regular(dependency_tree) && keep_back_references(name, dependency_tree);
  const nodes_in_b_loop = get_nodes_in_tree(filtered_tree);
  return substract(nodes_in_b_loop, [name]);
}

function find_all_nodes_in_cluster(analysed: Array<string>, waiting: Array<string>): Array<string> {
  const next = waiting.values().next();
  if (next.done) {
    return analysed;
  }

  const name = next.value;
  const new_analysed = union(analysed, [name]);
  const nodes_in_b_loop = get_cycles_from(name);
  const new_waiting = substract(union(waiting, nodes_in_b_loop), new_analysed);
  return find_all_nodes_in_cluster(new_analysed, new_waiting);
}

const all_nodes: Array<string> = graph.nodes.map((o: any) => o.id);

function assign_nodes_to_cluster(waiting: Array<string>, clusters: Array<Array<string>>): Array<Array<string>> {
  const next = waiting.values().next();
  if (next.done) {
    return clusters;
  }

  const name = next.value;
  const cluster = find_all_nodes_in_cluster([], [name]);
  const new_clusters = union(clusters, [cluster]);
  const new_waiting = substract(waiting, cluster);
  return assign_nodes_to_cluster(new_waiting, new_clusters);
}

console.log(JSON.stringify(assign_nodes_to_cluster(all_nodes, []), undefined, 2));
