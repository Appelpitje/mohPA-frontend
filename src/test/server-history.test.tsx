import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '../services/api';
import serverService from '../services/serverService';
import { ServerHistoryChart } from '../components/servers/ServerHistoryChart';
import { ServerWhoPlayedTable } from '../components/servers/ServerWhoPlayedTable';
import { ServerMapDistribution } from '../components/servers/ServerMapDistribution';
import { ServerHistory } from '../pages/servers/ServerHistory';
import { ServerDetailModal } from '../pages/servers/ServerDetailModal';
import { ToastProvider } from '../components/hud/Toast';
import {
  GameServer,
  ServerHistoryResponse,
  ServerHistoryChartPoint,
  ServerHistoryPlayer,
} from '../types/server';

const mockServer: GameServer = {
  id: 'test-srv-123',
  name: '[US-East] Henderson Airfield 24/7 Combat',
  gameSlug: 'mohpa',
  ipAddress: '198.51.100.10',
  port: 12203,
  queryPort: 12204,
  isRanked: true,
  isOnline: true,
  isOfficial: true,
  lastHeartbeat: new Date().toISOString(),
  maxPlayers: 32,
  currentPlayers: 18,
  mapName: 'Henderson Airfield',
  gameMode: 'Invader',
  region: 'us-east',
  ping: 28,
  details: {
    players: [
      { name: 'Sgt_Miller', score: 2500, kills: 22, deaths: 8, ping: 30 },
      { name: 'Capt_Speirs', score: 3200, kills: 30, deaths: 5, ping: 25 },
    ],
    rules: {
      sv_fps: 30,
      sv_pure: 0,
    },
  },
};

const mockChartPoints: ServerHistoryChartPoint[] = [
  {
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    playerCount: 12,
    peakCount: 14,
    maxPlayers: 32,
    isOnline: true,
    mapName: 'Henderson Airfield',
  },
  {
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    playerCount: 22,
    peakCount: 26,
    maxPlayers: 32,
    isOnline: true,
    mapName: 'Guadalcanal',
  },
  {
    timestamp: new Date().toISOString(),
    playerCount: 18,
    peakCount: 18,
    maxPlayers: 32,
    isOnline: true,
    mapName: 'Henderson Airfield',
  },
];

const mockPlayers: ServerHistoryPlayer[] = [
  {
    name: 'Capt_Speirs',
    score: 3200,
    kills: 30,
    deaths: 5,
    timePlayedSeconds: 7200,
    sessionCount: 2,
    firstSeen: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    lastSeen: new Date().toISOString(),
    isOnline: true,
  },
  {
    name: 'Sgt_Miller',
    score: 2500,
    kills: 22,
    deaths: 8,
    timePlayedSeconds: 5400,
    sessionCount: 2,
    firstSeen: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    lastSeen: new Date(Date.now() - 3600 * 1000).toISOString(),
    isOnline: false,
  },
  {
    name: 'Doc_Roe',
    score: 1800,
    kills: 10,
    deaths: 3,
    timePlayedSeconds: 3600,
    sessionCount: 1,
    firstSeen: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    lastSeen: new Date().toISOString(),
    isOnline: true,
  },
];

const mockHistoryResponse: ServerHistoryResponse = {
  server: mockServer,
  range: '24h',
  summary: {
    currentPlayers: 18,
    peakPlayers: 26,
    peakPlayersTime: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    averagePlayers: 17.3,
    minPlayers: 12,
    uptimePercentage: 99.8,
    totalSessions: 5,
    uniquePlayersCount: 3,
    topMaps: [
      { mapName: 'Henderson Airfield', occurrences: 12, percentage: 60 },
      { mapName: 'Guadalcanal', occurrences: 8, percentage: 40 },
    ],
  },
  chart: mockChartPoints,
  players: mockPlayers,
};

describe('Advanced Server History & GameTracker Stats', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  describe('serverService.getServerHistory', () => {
    it('calls GET /servers/:id/history with range parameter', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockHistoryResponse });

      const res = await serverService.getServerHistory('test-srv-123', '24h');
      expect(getSpy).toHaveBeenCalledWith('/servers/test-srv-123/history?range=24h');
      expect(res.summary.peakPlayers).toBe(26);
      expect(res.players.length).toBe(3);
    });
  });

  describe('ServerHistoryChart Component', () => {
    it('renders SVG chart with guidelines and handles range switching', () => {
      const handleRangeChange = vi.fn();

      render(
        <ServerHistoryChart
          chart={mockChartPoints}
          summary={mockHistoryResponse.summary}
          range="24h"
          onRangeChange={handleRangeChange}
          maxCapacity={32}
        />
      );

      expect(screen.getByText('Player History & Capacity')).toBeInTheDocument();
      expect(screen.getByText(/Current:/i)).toBeInTheDocument();
      expect(screen.getByText(/Peak:/i)).toBeInTheDocument();
      expect(screen.getByText(/Average:/i)).toBeInTheDocument();

      // Check range toggle buttons
      const btn7d = screen.getByRole('button', { name: '7 Days' });
      fireEvent.click(btn7d);
      expect(handleRangeChange).toHaveBeenCalledWith('7d');

      const btn30d = screen.getByRole('button', { name: '30 Days' });
      fireEvent.click(btn30d);
      expect(handleRangeChange).toHaveBeenCalledWith('30d');
    });
  });

  describe('ServerWhoPlayedTable Component', () => {
    it('renders historical players, formats duration, and filters by search', () => {
      render(
        <MemoryRouter>
          <ServerWhoPlayedTable players={mockPlayers} />
        </MemoryRouter>
      );

      expect(screen.getByText('Who Played')).toBeInTheDocument();
      expect(screen.getByText('Capt_Speirs')).toBeInTheDocument();
      expect(screen.getByText('Sgt_Miller')).toBeInTheDocument();
      expect(screen.getByText('Doc_Roe')).toBeInTheDocument();

      // Check formatted duration
      expect(screen.getByText('2h 0m')).toBeInTheDocument(); // 7200s
      expect(screen.getByText('1h 30m')).toBeInTheDocument(); // 5400s
      expect(screen.getByText('1h 0m')).toBeInTheDocument(); // 3600s

      // Filter search
      const input = screen.getByPlaceholderText(/search soldier callsign/i);
      fireEvent.change(input, { target: { value: 'miller' } });

      expect(screen.getByText('Sgt_Miller')).toBeInTheDocument();
      expect(screen.queryByText('Capt_Speirs')).not.toBeInTheDocument();
      expect(screen.queryByText('Doc_Roe')).not.toBeInTheDocument();
    });
  });

  describe('ServerMapDistribution Component', () => {
    it('renders map distribution percentages and map labels', () => {
      render(
        <ServerMapDistribution
          topMaps={mockHistoryResponse.summary.topMaps}
          gameSlug="mohpa"
        />
      );

      expect(screen.getByText('Map Rotation Distribution')).toBeInTheDocument();
      expect(screen.getByText('Henderson Airfield')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('Guadalcanal')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });

  describe('ServerHistory Page (/servers/:id/history)', () => {
    it('renders complete standalone analytics dashboard with KPIs and chart', async () => {
      vi.spyOn(serverService, 'getServerHistory').mockResolvedValueOnce(mockHistoryResponse);

      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter initialEntries={['/servers/test-srv-123/history']}>
              <Routes>
                <Route path="/servers/:id/history" element={<ServerHistory />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Henderson Airfield 24\/7 Combat/i })).toBeInTheDocument();
      });

      // Check 4 KPI cards
      expect(screen.getByText('Current Soldiers')).toBeInTheDocument();
      expect(screen.getByText('Peak Players (24h)')).toBeInTheDocument();
      expect(screen.getByText('Average Players')).toBeInTheDocument();
      expect(screen.getByText('Server Uptime')).toBeInTheDocument();

      // Check chart and player table
      expect(screen.getByText('Player History & Capacity')).toBeInTheDocument();
      expect(screen.getByText('Who Played')).toBeInTheDocument();
      expect(screen.getByText('Capt_Speirs')).toBeInTheDocument();
    });
  });

  describe('ServerDetailModal History Tab Integration', () => {
    it('switches to History & Stats tab and displays GameTracker chart and who played', async () => {
      vi.spyOn(serverService, 'getServerDetails').mockResolvedValueOnce({
        server: mockServer,
        scoreboard: mockServer.details?.players || [],
        rules: mockServer.details?.rules || {},
      });
      vi.spyOn(serverService, 'getServerHistory').mockResolvedValue(mockHistoryResponse);

      render(
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <MemoryRouter>
              <ServerDetailModal
                isOpen={true}
                onClose={() => {}}
                server={mockServer}
              />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>
      );

      // Verify Scoreboard is active by default
      expect(screen.getByText('LIVE THEATER SCOREBOARD')).toBeInTheDocument();

      // Click "History & Stats" tab
      const historyTabBtn = screen.getByRole('button', { name: /History & Stats/i });
      fireEvent.click(historyTabBtn);

      await waitFor(() => {
        expect(screen.getByText('Player History & Capacity')).toBeInTheDocument();
        expect(screen.getByText('Who Played')).toBeInTheDocument();
      });

      // Check standalone analytics link
      expect(screen.getByText('Full Analytics Page')).toBeInTheDocument();
    });
  });
});
