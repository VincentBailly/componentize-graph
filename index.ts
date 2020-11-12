type Graph = { nodes: string[], links: { source: string, target: string }[] };
type RegularTree = { node: string, children: Tree[], type: "regular" };
type BackReference = { node: string, type: "back_reference" };
type Tree = RegularTree | BackReference;

function is_regular(tree: Tree): tree is RegularTree {
  return tree.type === "regular";
}

function union<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set(Array.from(a).concat(Array.from(b)));
}

function substract<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set(Array.from(a).reduce((p, n) => b.has(n) ? p : [...p, n], []));
}

const graph: Graph = {
  nodes: [
    "A",
    "B",
    "C",
    "E",
    "F"
  ],
  links: [
    { source: "A", target: "B" },
    { source: "A", target: "E" },
    { source: "B", target: "C" },
    { source: "C", target: "B" },
    { source: "C", target: "D" },
    { source: "E", target: "C" },
    { source: "C", target: "E" },
    { source: "C", target: "F" }
  ]
}

function get_dependency_tree(root: string, graph: Graph, visited: Set<string>): Tree {
  if (visited.has(root)) {
    return { node: root, type: "back_reference" };
  }
  const updated_visited = new Set([...Array.from(visited), root]);
  const direct_dependencies = graph.links.filter(l => l.source === root).map(l => l.target);
  return { node: root, children: direct_dependencies.map(d => get_dependency_tree(d, graph, updated_visited)), type: "regular" };
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


function get_nodes_in_tree(tree: Tree): Set<string> {
  if (!is_regular(tree)) {
    return new Set();
  } else {
    return new Set([tree.node, ...tree.children.map(c => get_nodes_in_tree(c)).reduce((p, n) => Array.from(p).concat(Array.from(n)), [])]);
  }
}

/*
const a = get_dependency_tree("A", graph, new Set());
console.log(JSON.stringify(a, undefined, 2));

const a_is_cyclical = a.type === "regular" && is_cyclical(a);
console.log({a_is_cyclical});

const b_is_cyclical = is_regular(a) && is_regular(a.children[0]) && is_cyclical(a.children[0]);
console.log({b_is_cyclical});

const filtered = is_regular(a) && keep_back_references("B", a.children[0])
console.log(JSON.stringify(filtered, undefined, 2))

const nodes_in_first_loop = get_nodes_in_tree(filtered);
console.log({nodes_in_first_loop});
*/
function get_cycles_from(name: string): Set<string> {
  const dependency_tree = get_dependency_tree(name, graph, new Set());
  const b_is_cyclical = is_regular(dependency_tree) && is_cyclical(dependency_tree);
  if (!b_is_cyclical) {
    return new Set();
  }

  const filtered_tree = is_regular(dependency_tree) && keep_back_references(name, dependency_tree);
  const nodes_in_b_loop = get_nodes_in_tree(filtered_tree);
  return substract(nodes_in_b_loop, new Set([name]));
}

function find_all_nodes_in_cluster(analysed: Set<string>, waiting: Set<string>): Set<string> {
  const next = waiting.values().next();
  if (next.done) {
    return analysed;
  }

  const name = next.value;
  const new_analysed = union(analysed, new Set(name));
  const nodes_in_b_loop = get_cycles_from(name);
  const new_waiting = substract(union(waiting, nodes_in_b_loop), new_analysed);
  return find_all_nodes_in_cluster(new_analysed, new_waiting);
}

const all_nodes = new Set(graph.nodes);

function assign_nodes_to_cluster(waiting: Set<string>, clusters: Set<Set<string>>): Set<Set<string>> {
  const next = waiting.values().next();
  if (next.done) {
    return clusters;
  }

  const name = next.value;
  const cluster = find_all_nodes_in_cluster(new Set(), new Set([name]));
  const new_clusters = union(clusters, new Set([cluster]));
  const new_waiting = substract(waiting, cluster);
  return assign_nodes_to_cluster(new_waiting, new_clusters);
}

console.log(assign_nodes_to_cluster(all_nodes, new Set<Set<string>>()));
