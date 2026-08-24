export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export const defaultReportFilters = {
  startDate: todayDate(),
  endDate: todayDate(),
  page: 1,
  limit: 20,
};
