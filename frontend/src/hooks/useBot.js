import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

const API = '/api';
const WS_URL = `ws://${window.location.hostname}:3001`;

export function useBot() {
  const [config, setConfig] = useState({
    interval: '5m',
    candlesForAvg: 10,
    volumeMultiplier: 3.0,
    priceChangeThreshold: 0,
    cooldownMinutes: 15,
    selectedPairs: [],
    excludedPairs: [],
  });
  const [running, setRunning]     = useState(false);
  const [pairsData, setPairsData] = useState({});
  const [alerts, setAlerts]       = useState([]);
  const [stats, setStats]         = useState({ lastScan: null, totalScans: 0, alertsToday: 0, pairsScanned: 0 });
  const [allPairs, setAllPairs]   = useState([]);
  const [loadingPairs, setLoadingPairs] = useState(false);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'config':
        setConfig(msg.data);
        break;
      case 'status':
        setRunning(msg.data.running);
        break;
      case 'pairs_update':
        setPairsData(msg.data);
        break;
      case 'alert':
        setAlerts(prev => [msg.data, ...prev].slice(0, 100));
        break;
      case 'alerts_history':
        setAlerts(msg.data);
        break;
      case 'stats':
        setStats(msg.data);
        break;
    }
  }, []);

  const { connected } = useWebSocket(WS_URL, handleMessage);

  const fetchAllPairs = useCallback(async () => {
    setLoadingPairs(true);
    try {
      const res = await fetch(`${API}/pairs`);
      const json = await res.json();
      if (json.success) setAllPairs(json.data);
    } catch (e) {
      console.error('Failed to fetch pairs', e);
    } finally {
      setLoadingPairs(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPairs();
  }, [fetchAllPairs]);

  const updateConfig = useCallback(async (updates) => {
    try {
      const res = await fetch(`${API}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) setConfig(json.data);
      return json.success;
    } catch {
      return false;
    }
  }, []);

  const startBot = useCallback(async () => {
    const res = await fetch(`${API}/scanner/start`, { method: 'POST' });
    const json = await res.json();
    if (json.success) setRunning(true);
    return json;
  }, []);

  const stopBot = useCallback(async () => {
    const res = await fetch(`${API}/scanner/stop`, { method: 'POST' });
    const json = await res.json();
    if (json.success) setRunning(false);
    return json;
  }, []);

  const saveTelegramConfig = useCallback(async (token, chatId) => {
    const res = await fetch(`${API}/telegram/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatId }),
    });
    return res.json();
  }, []);

  const testTelegram = useCallback(async (token, chatId) => {
    const res = await fetch(`${API}/telegram/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatId }),
    });
    return res.json();
  }, []);

  return {
    config, running, pairsData, alerts, stats,
    allPairs, loadingPairs, connected,
    updateConfig, startBot, stopBot,
    saveTelegramConfig, testTelegram, fetchAllPairs,
  };
}
