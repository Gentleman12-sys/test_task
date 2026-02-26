export interface WbTariffItem {
  nmid: number;
  box_type_name: string;
  size: string | null;
  warehouse_id: number;
  warehouse_name: string;
  coef: number;
  amount: number;
  region_id: number;
  region_name: string;
  date?: string;
}

export interface WbTariffResponse {
  data: WbTariffItem[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface TariffRecord {
  id?: number;
  date: string;
  nmid: number;
  box_type_name: string;
  size: string | null;
  warehouse_id: number;
  warehouse_name: string;
  coef: number;
  amount: number;
  region_id: number;
  region_name: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  range: string;
}