export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  aliases?: string[];
  source?: string;
  category?: string;
  summary?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  linkCount: number;
  /** 'note' (default) | 'category' (overview bucket) | 'ghost' (unresolved [[link]]) */
  kind?: 'note' | 'category' | 'ghost';
  /** for category nodes: number of notes inside */
  count?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type ViewMode = 'editor' | 'graph';
