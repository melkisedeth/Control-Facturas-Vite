export interface Delivery {
  date: Date;
  photos: string[];
  notes: string;
  deliveredBy: string;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  status: 'Pendiente' | 'Parcial' | 'Despachada';
  photos: string[];
  deliveries: Delivery[];
  createdAt: Date;
  updatedAt: Date;
  userEmail?: string;
  userId?: string;
  deliveredAt?: Date;
}