import { requireRepo } from './repo.js';

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'file' | 'text' | 'link';
  file?: string;
  text?: string;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/** Generate a JSON Canvas 1.0 file from the backlinks graph */
export async function generateCanvas(cwd: string): Promise<CanvasData> {
  await requireRepo(cwd);

  // TODO: Read links table from db.sqlite
  // TODO: Layout nodes in a grid/force-directed layout
  // TODO: Create edges from backlinks
  // TODO: Write .canvas file to wiki/canvas/

  throw new Error('Not implemented');
}
