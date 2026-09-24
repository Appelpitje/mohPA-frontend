import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '../services/api';
import { statsService } from '../services/statsService';
import { Leaderboards } from '../pages/stats/Leaderboards';
import { PlayerProfile } from '../pages/stats/PlayerProfile';
import { DownloadGuides } from '../pages/setup/DownloadGuides';
import { HostsGenerator } from '../pages/setup/HostsGenerator';
import { TroubleshootingFaq } from '../pages/setup/TroubleshootingFaq';

// Mock apiClient
vi.mock('../services/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: mockApi,
    apiClient: mockApi,
  };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

describe('Module 5: Stats & Leaderboard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('statsService.getLeaderboard calls GET /stats/leaderboard/:game_slug with params', async () => {
    const mockResponse = {
      data: {
        gameSlug: 'mohpa',
        gameName: 'Battlefield 2142',
        sortBy: 'score',
        limit: 50,
        offset: 0,
        count: 1,
        leaderboard: [
          {
            personaId: 'p-1',
            name: 'CommanderVance',
            userId: 'u-1',
            gameSlug: 'mohpa',
            score: 125000,
            kills: 1450,
            deaths: 580,
            wins: 120,
            losses: 45,
            timePlayedSeconds: 72000,
          },
        ],
      },
    };

    (apiClient.get as any).mockResolvedValueOnce(mockResponse);

    const res = await statsService.getLeaderboard('mohpa', 'score', 50, 0);

    expect(apiClient.get).toHaveBeenCalledWith('/stats/leaderboard/mohpa', {
      params: {
        sort: 'score',
        limit: 50,
        offset: 0,
      },
    });
    expect(res.leaderboard[0].name).toBe('CommanderVance');
  });

  it('statsService.getLeaderboard normalizes entries when API provides personaName instead of name', async () => {
    const mockResponse = {
      data: {
        gameSlug: 'mohpa',
        gameName: 'Medal of Honor: Pacific Assault',
        sortBy: 'score',
        limit: 50,
        offset: 0,
        count: 1,
        leaderboard: [
          {
            personaId: 'c3bbbd6c-a433-4c0f-9389-9732bc8f4876',
            score: 500,
            kills: 10,
            deaths: 2,
            wins: 1,
            losses: 0,
            timePlayedSeconds: 300,
            customStats: {},
            personaName: 'Appelpitje',
            userId: '3def9fef-e0b7-43dc-9f96-129e8a69a353',
            gameSlug: 'mohpa',
          },
        ],
      },
    };

    (apiClient.get as any).mockResolvedValueOnce(mockResponse);

    const res = await statsService.getLeaderboard('mohpa', 'score', 50, 0);

    expect(res.leaderboard[0].name).toBe('Appelpitje');
    expect(res.leaderboard[0].personaName).toBe('Appelpitje');
  });

  it('statsService.getPlayerProfile calls GET /stats/players/:name with game_slug', async () => {
    const mockProfile = {
      data: {
        persona: {
          id: 'persona-123',
          userId: 'user-456',
          gameSlug: 'mohpa',
          name: 'GeneralIron',
          isActive: true,
          createdAt: '2024-01-15T12:00:00.000Z',
        },
        stats: {
          personaId: 'persona-123',
          score: 350000,
          kills: 4200,
          deaths: 1500,
          wins: 240,
          losses: 80,
          timePlayedSeconds: 144000,
        },
      },
    };

    (apiClient.get as any).mockResolvedValueOnce(mockProfile);

    const res = await statsService.getPlayerProfile('GeneralIron', 'mohpa');

    expect(apiClient.get).toHaveBeenCalledWith('/stats/players/GeneralIron', {
      params: {
        game_slug: 'mohpa',
        gameSlug: 'mohpa',
      },
    });
    expect(res.persona.name).toBe('GeneralIron');
    expect(res.stats.score).toBe(350000);
  });

  it('statsService.getMatchHistory calls GET /stats/matches/:game_slug with limit', async () => {
    const mockMatches = {
      data: {
        gameSlug: 'mohpa',
        count: 2,
        matches: [
          {
            id: 'm-1',
            serverId: 'srv-1',
            gameSlug: 'mohpa',
            mapName: 'Suez Canal 2142',
            gameMode: 'Titan Assault',
            durationSeconds: 1250,
            winnerTeam: 1,
            createdAt: '2024-05-10T14:30:00.000Z',
          },
        ],
      },
    };

    (apiClient.get as any).mockResolvedValueOnce(mockMatches);

    const res = await statsService.getMatchHistory('mohpa', 10);

    expect(apiClient.get).toHaveBeenCalledWith('/stats/matches/mohpa', {
      params: { limit: 10 },
    });
    expect(res.matches[0].mapName).toBe('Suez Canal 2142');
  });
});

import { useGameStore } from '../store/gameStore';

describe('Module 5: Leaderboards Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({ activeGame: 'mohpa' });
  });

  it('renders leaderboard table with medals, ranks, and player links', async () => {
    const mockLeaderboard = {
      gameSlug: 'mohpa',
      gameName: 'Battlefield 2142',
      sortBy: 'score' as const,
      limit: 100,
      offset: 0,
      count: 3,
      leaderboard: [
        {
          personaId: 'p-1',
          name: 'ReconGhost',
          userId: 'u-1',
          gameSlug: 'mohpa',
          score: 550000,
          kills: 6200,
          deaths: 1800,
          wins: 400,
          losses: 100,
          timePlayedSeconds: 180000,
        },
        {
          personaId: 'p-2',
          name: 'TitanMaster',
          userId: 'u-2',
          gameSlug: 'mohpa',
          score: 420000,
          kills: 4800,
          deaths: 2000,
          wins: 320,
          losses: 120,
          timePlayedSeconds: 150000,
        },
        {
          personaId: 'p-3',
          name: 'MechWalker',
          userId: 'u-3',
          gameSlug: 'mohpa',
          score: 310000,
          kills: 3500,
          deaths: 1700,
          wins: 250,
          losses: 90,
          timePlayedSeconds: 120000,
        },
      ],
    };

    vi.spyOn(statsService, 'getLeaderboard').mockResolvedValue(mockLeaderboard as any);

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/leaderboards?game=mohpa']}>
          <Leaderboards />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('heading', { name: /Stats/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('ReconGhost').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('TitanMaster').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('MechWalker').length).toBeGreaterThanOrEqual(1);
    });

    // Check medals
    expect(screen.getByText(/#1/)).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();
    expect(screen.getByText(/#3/)).toBeInTheDocument();

    // Check links
    const playerLink = screen.getByRole('link', { name: /ReconGhost/i });
    expect(playerLink).toHaveAttribute('href', '/stats/player/ReconGhost?game=mohpa');
  });

  it('filters leaderboard rows when searching', async () => {
    const mockLeaderboard = {
      gameSlug: 'mohpa',
      gameName: 'Battlefield 2142',
      sortBy: 'score' as const,
      limit: 100,
      offset: 0,
      count: 2,
      leaderboard: [
        {
          personaId: 'p-1',
          name: 'AlphaDog',
          userId: 'u-1',
          gameSlug: 'mohpa',
          score: 200000,
          kills: 1000,
          deaths: 500,
          wins: 100,
          losses: 50,
          timePlayedSeconds: 50000,
        },
        {
          personaId: 'p-2',
          name: 'BravoEcho',
          userId: 'u-2',
          gameSlug: 'mohpa',
          score: 180000,
          kills: 900,
          deaths: 450,
          wins: 90,
          losses: 45,
          timePlayedSeconds: 45000,
        },
      ],
    };

    vi.spyOn(statsService, 'getLeaderboard').mockResolvedValue(mockLeaderboard as any);

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/leaderboards?game=mohpa']}>
          <Leaderboards />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('AlphaDog').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('BravoEcho').length).toBeGreaterThanOrEqual(1);
    });

    const searchInput = screen.getByPlaceholderText(/Filter by soldier name/i);
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getAllByText('AlphaDog').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('BravoEcho')).not.toBeInTheDocument();
  });

  it('renders leaderboard safely when entries only have personaName (avoids slice undefined crash)', async () => {
    const mockLeaderboard = {
      gameSlug: 'mohpa',
      gameName: 'Medal of Honor: Pacific Assault',
      sortBy: 'score' as const,
      limit: 50,
      offset: 0,
      count: 1,
      leaderboard: [
        {
          personaId: 'p-prod-1',
          personaName: 'Appelpitje',
          // name is intentionally omitted or undefined
          userId: 'u-prod-1',
          gameSlug: 'mohpa',
          score: 12000,
          kills: 85,
          deaths: 20,
          wins: 5,
          losses: 1,
          timePlayedSeconds: 3600,
        },
      ],
    };

    vi.spyOn(statsService, 'getLeaderboard').mockResolvedValue(mockLeaderboard as any);

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/stats?game=mohpa']}>
          <Leaderboards />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Appelpitje').length).toBeGreaterThanOrEqual(1);
      // Verify avatar initial 'A' is rendered without error
      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });
});

describe('Module 5: PlayerProfile Dossier Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders full operative dossier with rank grade, metrics, and class breakdown', async () => {
    const mockProfile = {
      persona: {
        id: 'p-999-guid',
        userId: 'u-999',
        gameSlug: 'mohpa',
        name: 'ColVance',
        isActive: true,
        createdAt: '2024-02-20T08:00:00.000Z',
      },
      stats: {
        personaId: 'p-999-guid',
        score: 85000,
        kills: 2100,
        deaths: 840,
        wins: 180,
        losses: 60,
        timePlayedSeconds: 108000,
      },
    };

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/stats/players/')) return Promise.resolve({ data: mockProfile });
      return Promise.resolve({ data: {} });
    });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/stats/player/ColVance?game=mohpa']}>
          <Routes>
            <Route path="/stats/player/:name" element={<PlayerProfile />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ColVance')).toBeInTheDocument();
      expect(screen.getByText(/ACTIVE OPERATIVE/i)).toBeInTheDocument();
      expect(screen.getByText(/Colonel/i)).toBeInTheDocument();
      expect(screen.getAllByText('85,000').length).toBeGreaterThan(0);
      expect(screen.getByText('2.50')).toBeInTheDocument(); // K/D Ratio
      expect(screen.getByText('75.0%')).toBeInTheDocument(); // Win Rate: 180 / 240
    });

    expect(screen.queryByRole('heading', { level: 4, name: 'ASSAULT' })).not.toBeInTheDocument();
    expect(screen.queryByText(/ENGINEER/i)).not.toBeInTheDocument();
    expect(screen.queryByText('32,300')).not.toBeInTheDocument();
    expect(screen.getByText('Team bonus')).toBeInTheDocument();

    // Match history is dummy placeholder data; keep it off the dossier until real logs exist
    expect(screen.queryByText(/ENGAGEMENT LOG/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Verdun Liberation')).not.toBeInTheDocument();
    expect(screen.queryByText('Minsk Perimeter')).not.toBeInTheDocument();
  });

  it('shows stored career keys and hides the fake class split', async () => {
    const mockProfile = {
      persona: {
        id: 'p-career',
        userId: 'u-career',
        gameSlug: 'mohpa',
        name: 'Col_Voss',
        isActive: true,
        createdAt: '2024-02-20T08:00:00.000Z',
      },
      stats: {
        personaId: 'p-career',
        score: 100,
        kills: 0,
        deaths: 0,
        wins: 0,
        losses: 0,
        timePlayedSeconds: 0,
        customStats: { totalAlliedMostAccurate: 2 },
      },
    };

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/stats/players/')) return Promise.resolve({ data: mockProfile });
      return Promise.resolve({ data: {} });
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/stats/player/Col_Voss']}>
          <Routes>
            <Route path="/stats/player/:name" element={<PlayerProfile />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('totalAlliedMostAccurate')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('38')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ASSAULT' })).not.toBeInTheDocument();
  });

  it('opens compare stats modal when clicking Compare Stats button', async () => {
    const mockProfile = {
      persona: {
        id: 'p-1',
        userId: 'u-1',
        gameSlug: 'mohpa',
        name: 'TestSoldier',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      stats: {
        personaId: 'p-1',
        score: 10000,
        kills: 200,
        deaths: 100,
        wins: 20,
        losses: 10,
        timePlayedSeconds: 36000,
      },
    };

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/stats/players/')) return Promise.resolve({ data: mockProfile });
      return Promise.resolve({ data: {} });
    });

    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/stats/player/TestSoldier']}>
          <Routes>
            <Route path="/stats/player/:name" element={<PlayerProfile />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('TestSoldier')).toBeInTheDocument();
    });

    const compareBtn = screen.getByRole('button', { name: /Compare Stats/i });
    fireEvent.click(compareBtn);

    expect(screen.getByText(/COMPARISON \/\//i)).toBeInTheDocument();
    expect(screen.getByText(/SECTOR AVG/i)).toBeInTheDocument();
  });
});

describe('Module 7: Setup & Download Guides Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('HostsGenerator creates formatted entries and allows custom IP and game selection', () => {
    render(
      <MemoryRouter>
        <HostsGenerator />
      </MemoryRouter>
    );

    expect(screen.getByText(/INTERACTIVE HOSTS FILE GENERATOR/i)).toBeInTheDocument();

    // Default contains fesl.ea.com
    expect(screen.getAllByText(/fesl\.ea\.com/i).length).toBeGreaterThanOrEqual(1);

    // Change server IP
    const ipInput = screen.getByPlaceholderText(/178\.105\.150\.25/i);
    fireEvent.change(ipInput, { target: { value: '192.168.1.150' } });

    expect(screen.getByText(/192\.168\.1\.150\s+fesl\.ea\.com/i)).toBeInTheDocument();
  });

  it('HostsGenerator uses the VPS IP when accessed on portal.mohpa.net', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, hostname: 'portal.mohpa.net' } as any;

    try {
      render(
        <MemoryRouter>
          <HostsGenerator />
        </MemoryRouter>
      );

      expect(screen.getByText(/MOHPA MASTER SERVER VS WEB PORTAL/i)).toBeInTheDocument();
      expect(screen.getAllByText(/portal\.mohpa\.net/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/centralspy\./i)).toBeNull();
      expect(screen.getAllByText(/178\.105\.150\.25/i).length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText(/178\.105\.150\.25\s+fesl\.ea\.com/i)).toBeInTheDocument();
      expect(screen.getByText(/178\.105\.150\.25\s+theater\.ea\.com/i)).toBeInTheDocument();

      expect(screen.queryByText(/portal\.mohpa\.net\s+fesl\.ea\.com/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /Master Host/i })).toBeNull();
    } finally {
      (window as any).location = originalLocation;
    }
  });

  it('TroubleshootingFaq renders error codes and filters by search query', () => {
    render(
      <MemoryRouter>
        <TroubleshootingFaq />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/errorCode=122/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Invalid Key \/ Game Not Registered/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search error code/i);
    fireEvent.change(searchInput, { target: { value: '122' } });

    expect(screen.getAllByText(/errorCode=122/i)[0]).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Key \/ Game Not Registered/i)).toBeNull();
  });

  it('DownloadGuides renders navigation tabs and switches between guides', () => {
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <DownloadGuides />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /^Setup$/i })).toBeInTheDocument();
    expect(screen.getByText(/How traffic is routed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Setup \(Client Patch\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dedicated Server Setup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Troubleshooting FAQ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manual \/ Legacy Hosts/i })).toBeInTheDocument();

    // Default tab is Quick Setup (Client Patch)
    expect(screen.getByText(/TLS & SSL CERTIFICATE BYPASS ARCHITECTURE/i)).toBeInTheDocument();

    const zipLink = screen.getByRole('link', { name: /Download mohPA Patch/i });
    expect(zipLink).toHaveAttribute(
      'href',
      '/downloads/mohPA-Client-Patch.zip'
    );
    expect(zipLink).toHaveAttribute('download', 'mohPA-Client-Patch.zip');
    expect(zipLink.getAttribute('href')).not.toContain('(1)');
    expect(zipLink.textContent).not.toContain('(1)');

    // Verify all 4 instructions and no hosts edit callout are present
    expect(screen.getAllByText(/Extract the zip contents directly into your game folder/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Run Patch-MOHPA\.bat/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No Hosts-File Edits Required/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fully quit the game/i).length).toBeGreaterThan(0);

    // Switch to Manual / Legacy Hosts tab
    const hostsTab = screen.getByRole('button', { name: /Manual \/ Legacy Hosts/i });
    fireEvent.click(hostsTab);
    expect(screen.getByText(/INTERACTIVE HOSTS FILE GENERATOR/i)).toBeInTheDocument();
  });
});
