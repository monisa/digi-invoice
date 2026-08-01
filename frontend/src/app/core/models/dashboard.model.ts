export interface PerRep {
  ownerId: string | null;
  name: string;
  totalQuotes: number;
  acceptedQuotes: number;
  totalValue: string;
}

export interface DashboardSummary {
  quotes: {
    total: number;
    open: number;
    byStatus: Record<string, number>;
  };
  pipelineValue: string;
  acceptedValue: string;
  winRate: number;
  expiringSoon: number;
  invoicedValue: string;
  invoices: {
    total: number;
    outstanding: number;
    paid: number;
    byStatus: Record<string, number>;
  };
  perRep: PerRep[];
}
