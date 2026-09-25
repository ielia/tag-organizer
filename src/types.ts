export interface TagRow {
  id: string;
  tags: string[];
}

/** An in-flight touch drag of one or more tags. Mouse drags use HTML5 drag-and-drop. */
export interface TagDrag {
  tags: string[];
  sourceRowId: string | null;
  x: number;
  y: number;
  overRowId: string | null;
  overNew: boolean;
}
