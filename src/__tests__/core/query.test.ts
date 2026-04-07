describe('query', () => {
  it.todo('loads index.md as initial context');
  it.todo('uses FTS5 to find relevant articles');
  it.todo('performs BFS/DFS traversal for context gathering');
  it.todo('calls LLM with gathered context');
  it.todo('files answer back to derived/qa/ when fileBack=true');
});

describe('explain', () => {
  it.todo('finds article by slug');
  it.todo('loads neighbors from links table');
  it.todo('calls LLM to synthesize explanation');
});
