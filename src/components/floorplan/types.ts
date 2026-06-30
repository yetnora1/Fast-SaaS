export type TableShape = "round" | "square" | "rectangle" | "booth";
export type TableStatus = "available" | "occupied" | "attention" | "dirty";

export interface FloorTable {
  id: string;
  branchId?: string;
  number: number;
  status: TableStatus | string;
  shape: TableShape;
  capacity: number;
  xPos: number;
  yPos: number;
  rotation: number;
  orders?: { id: string }[];
}
