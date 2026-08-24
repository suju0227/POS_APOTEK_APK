export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const APP_TIMEZONE =
  import.meta.env.VITE_APP_TIMEZONE || 'Asia/Makassar';
export const LOCAL_NETWORK_MODE =
  import.meta.env.VITE_LOCAL_NETWORK_MODE === 'true';
export const ENABLE_CONNECTION_STATUS =
  import.meta.env.VITE_ENABLE_CONNECTION_STATUS !== 'false';

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL belum dikonfigurasi');
}
