export type RegistroVisitaRow = {
  entregaId: number;
  fecha: string;
  createdAt: string;
  personaNombre: string;
  esSlotVisita: boolean;
  nombreOficial: string | null;
  slotIndex?: number | null;
};

export type RegistroVisitaFilters = {
  dateFrom: string;
  dateTo: string;
  tipo: "all" | "slot" | "real";
  q: string;
};
