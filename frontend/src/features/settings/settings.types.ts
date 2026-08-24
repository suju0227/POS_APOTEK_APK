export type AppSettings = {
  id: string;
  pharmacyName: string;
  address: string | null;
  phone: string | null;
  expiredAlertDays: number;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateSettingsPayload = {
  pharmacyName?: string;
  address?: string | null;
  phone?: string | null;
  expiredAlertDays?: number;
  timezone?: string;
};
