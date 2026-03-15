export type UnitMeasure = {
  id: number;
  name: string;
  abbreviation: string;
  description: string;
  isBasic: boolean;
}

export type UnitMatrix = Omit<UnitMeasure, 'isBasic'> & {
  factor: number;
}