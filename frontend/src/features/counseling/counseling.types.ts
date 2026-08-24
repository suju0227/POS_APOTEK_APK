export type CounselingRecord = {
  id: string;
  prescriptionId: string | null;
  saleId: string | null;
  patientName: string | null;
  counselingDate: string;
  educationSummary: string;
  note: string | null;
  createdAt: string;
  pharmacist: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
  prescriptionNumber: string | null;
  saleNumber: string | null;
};

export type CreateCounselingPayload = {
  prescriptionId?: string;
  saleId?: string;
  patientName?: string;
  counselingDate?: string;
  educationSummary: string;
  note?: string;
};
