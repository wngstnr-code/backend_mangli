export interface VisitorCheckin {
  id: string;
  order_id: string;
  checked_in_by: string | null;
  number_of_visitors: number;
  notes: string | null;
  checked_in_at: string;
  created_at: string;
}

export interface CreateVisitorCheckinDTO {
  order_id: string;
  checked_in_by?: string;
  number_of_visitors: number;
  notes?: string;
}

export interface VisitorCheckinSummary {
  date: string;
  total_checkins: number;
  total_visitors: number;
}
