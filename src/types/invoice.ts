export interface Delivery {
  date: Date;
  photos: string[];
  notes: string;
  deliveredBy: string;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  clientId?: string; // Nuevo campo
  clientName: string;
  clientPhone: string;
  clientEmail?: string; // Nuevo campo
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