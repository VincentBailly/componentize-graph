const graph = {
  nodes: [
    "A",
    "B",
    "C"
  ],
  links: [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "B" }
  ]
}

function get_dependency_tree(_graph: any) {
}

const a = get_dependency_tree(graph);
console.log(a);

