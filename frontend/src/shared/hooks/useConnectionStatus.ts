import { useEffect, useState } from 'react';
import { API_BASE_URL, ENABLE_CONNECTION_STATUS } from '../config';

export type ConnectionStatus = 'checking' | 'online' | 'offline';

type HealthResponse = {
  status: 'ok';
  serverTime: string;
  timezone: string;
  database: 'connected';
};

export function useConnectionStatus(intervalMs = 20_000) {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);

  useEffect(() => {
    if (!ENABLE_CONNECTION_STATUS) {
      setStatus('online');
      return;
    }

    let active = true;
    let timeoutId: number | undefined;

    const check = async () => {
      const controller = new AbortController();
      const abortId = window.setTimeout(() => controller.abort(), 5_000);

      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Health check gagal');
        const health = (await response.json()) as HealthResponse;
        if (!active) return;
        setStatus(health.status === 'ok' ? 'online' : 'offline');
        setServerTime(health.serverTime ?? null);
      } catch {
        if (active) {
          setStatus('offline');
          setServerTime(null);
        }
      } finally {
        window.clearTimeout(abortId);
        if (active) {
          setLastCheckedAt(new Date());
          timeoutId = window.setTimeout(check, intervalMs);
        }
      }
    };

    void check();

    return () => {
      active = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [intervalMs]);

  return {
    status,
    isOnline: status === 'online',
    isOffline: status === 'offline',
    lastCheckedAt,
    serverTime,
  };
}
