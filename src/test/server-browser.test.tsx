import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '../services/api';
import serverService from '../services/serverService';
import { ServerBrowser } from '../pages/servers/ServerBrowser';
import { ServerFilters, ServerFilterState } from '../components/servers/ServerFilters';
import { ServerDetailModal } from '../pages/servers/ServerDetailModal';
import { DirectConnectModal } from '../components/servers/DirectConnectModal';
import { ToastProvider } from '../components/hud/Toast';
import { GameServer, ScoreboardPlayer, ServerDetails } from '../types/server';

const mockServers: GameServer[] = [
  {
    id: 'srv-1',
    name: '[EU] Official Titan 24/7 Fast Vehicle Spawn',
    gameSlug: 'mohpa',
    ipAddress: '198.51.100.10',
    port: 18275,
    queryPort: 18270,
    isRanked: true,
    isOnline: true,
    isOfficial: true,
    lastHeartbeat: new Date().toISOString(),
    maxPlayers: 64,
    currentPlayers: 48,
    mapName: 'Suez Canal 2142',
    gameMode: 'Titan',
    region: 'fra',
    ping: 28,
    details: {
      map: 'Suez Canal 2142',
      gameMode: 'Titan',
      ranked: true,
      timeLimit: 1800,
      scoreLimit: 2,
      passwordProtected: false,
      players: [
        { name: 'CommanderVanguard', score: 2450, kills: 28, deaths: 12, ping: 22, team: 1, rank: 45 },
        { name: 'PAC_Infiltrator', score: 2100, kills: 24, deaths: 14, ping: 35, team: 2, rank: 42 },
      ],
      rules: {
        friendlyFire: false,
        autoBalance: true,
        titanShieldTime: 120,
      },
    },
  },
  {
    id: 'srv-2',
    name: '[US] Bad Company 2 Heavy Metal Rush Only',
    gameSlug: 'mohpa',
    ipAddress: '203.0.113.50',
    port: 19567,
    isRanked: true,
    isOnline: true,
    isOfficial: false,
    lastHeartbeat: new Date().toISOString(),
    maxPlayers: 32,
    currentPlayers: 0,
    mapName: 'Heavy Metal',
    gameMode: 'Rush',
    region: 'iad',
    ping: 42,
    details: {
      players: [],
      rules: {
        hardcore: true,
      },
    },
  },
  {
    id: 'srv-3',
    name: '[ASIA] Full Capacity Titan 64/64',
    gameSlug: 'mohpa',
    ipAddress: '198.51.100.99',
    port: 18275,
    isRanked: false,
    isOnline: false,
    lastHeartbeat: new Date().toISOString(),
    maxPlayers: 64,
    currentPlayers: 64,
    mapName: 'Minsk',
    gameMode: 'Titan',
    region: 'tyo',
    ping: 135,
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const testClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testClient}>
      <ToastProvider>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('Module 4: serverService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getServers calls GET /servers with formatted filter query parameters', async () => {
    const mockResponse = {
      servers: mockServers,
      count: 3,
      limit: 50,
      offset: 0,
    };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockResponse });

    const result = await serverService.getServers({
      gameSlug: 'mohpa',
      isOnline: true,
      isRanked: true,
      mapName: 'Suez Canal 2142',
      search: 'Titan',
      limit: 25,
      offset: 0,
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/servers?game_slug=mohpa&is_online=true&is_ranked=true&map_name=Suez+Canal+2142&search=Titan&limit=25&offset=0'
    );
    expect(result.servers).toHaveLength(3);
    expect(result.count).toBe(3);
  });

  it('getServerDetails calls GET /servers/:id and returns server, scoreboard, and rules', async () => {
    const mockDetails: ServerDetails = {
      server: mockServers[0],
      scoreboard: mockServers[0].details?.players as ScoreboardPlayer[],
      rules: mockServers[0].details?.rules as Record<string, any>,
    };
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockDetails });

    const result = await serverService.getServerDetails('srv-1');

    expect(getSpy).toHaveBeenCalledWith('/servers/srv-1');
    expect(result.server.name).toContain('Official Titan');
    expect(result.scoreboard).toHaveLength(2);
    expect(result.rules.titanShieldTime).toBe(120);
  });

  it('registerServer calls POST /servers/register with server configuration payload', async () => {
    const newServerPayload = {
      name: '[EU] New Dedicated Host',
      gameSlug: 'bf2142',
      ipAddress: '198.51.100.200',
      port: 18275,
      queryPort: 18270,
      isRanked: true,
      maxPlayers: 64,
    };
    const mockResponse = {
      server: { id: 'srv-new', ...newServerPayload, isOnline: true, lastHeartbeat: new Date() },
      secretKey: 'sec_test_secret_key_123',
    };
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: mockResponse });

    const result = await serverService.registerServer(newServerPayload);

    expect(postSpy).toHaveBeenCalledWith('/servers/register', newServerPayload);
    expect(result.secretKey).toBe('sec_test_secret_key_123');
    expect(result.server.name).toBe('[EU] New Dedicated Host');
  });
});

describe('Module 4: ServerFilters Component', () => {
  it('renders search input, game dropdown, map dropdown, and filter checkboxes', () => {
    const mockFilters: ServerFilterState = {
      search: '',
      gameSlug: '',
      mapName: '',
      isRanked: false,
      isOfficial: false,
      hideEmpty: false,
      hideFull: false,
    };
    const onFilterChange = vi.fn();
    const onReset = vi.fn();

    render(
      <ServerFilters
        filters={mockFilters}
        onFilterChange={onFilterChange}
        onReset={onReset}
        totalCount={10}
        filteredCount={10}
      />
    );

    expect(screen.getByPlaceholderText(/Search server name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by Game/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Filter by Map/i)).toBeInTheDocument();
    expect(screen.getByText(/Ranked Only/i)).toBeInTheDocument();
    expect(screen.getByText(/^Official$/i)).toBeInTheDocument();
    expect(screen.getByText(/Hide Empty/i)).toBeInTheDocument();
    expect(screen.getByText(/Hide Full/i)).toBeInTheDocument();
  });

  it('triggers onFilterChange when searching or selecting options', () => {
    const mockFilters: ServerFilterState = {
      search: '',
      gameSlug: '',
      mapName: '',
      isRanked: false,
      isOfficial: false,
      hideEmpty: false,
      hideFull: false,
    };
    const onFilterChange = vi.fn();
    const onReset = vi.fn();

    render(
      <ServerFilters
        filters={mockFilters}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search server name/i);
    fireEvent.change(searchInput, { target: { value: 'Titan' } });
    expect(onFilterChange).toHaveBeenCalledWith({ search: 'Titan' });

    const gameSelect = screen.getByLabelText(/Filter by Game/i);
    fireEvent.change(gameSelect, { target: { value: 'mohpa' } });
    expect(onFilterChange).toHaveBeenCalledWith({ gameSlug: 'mohpa', mapName: '' });

    const hideEmptyCheckbox = screen.getByRole('checkbox', { name: /Hide Empty/i });
    fireEvent.click(hideEmptyCheckbox);
    expect(onFilterChange).toHaveBeenCalledWith({ hideEmpty: true });
  });
});

describe('Module 4: ServerBrowser Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders server telemetry header, columns, and server records', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        servers: mockServers,
        count: 3,
        limit: 100,
        offset: 0,
      },
    });

    renderWithProviders(<ServerBrowser />);

    // Header & Telemetry
    expect(screen.getByRole('heading', { name: /Servers/i })).toBeInTheDocument();
    expect(screen.getByText(/Auto-refresh/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Online/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Players$/i).length).toBeGreaterThan(0);

    // Table Data
    await waitFor(() => {
      expect(screen.getByText('[EU] Official Titan 24/7 Fast Vehicle Spawn')).toBeInTheDocument();
      expect(screen.getByText('[US] Bad Company 2 Heavy Metal Rush Only')).toBeInTheDocument();
    });

    // Check capacity column
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getAllByText(/\/ 64/i).length).toBeGreaterThanOrEqual(1);
  });

  it('filters empty servers when Hide Empty is toggled', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        servers: mockServers,
        count: 3,
        limit: 100,
        offset: 0,
      },
    });

    renderWithProviders(<ServerBrowser />);

    await waitFor(() => {
      expect(screen.getByText('[US] Bad Company 2 Heavy Metal Rush Only')).toBeInTheDocument();
    });

    // Toggle Hide Empty
    const hideEmptyCheckbox = screen.getByRole('checkbox', { name: /Hide Empty/i });
    fireEvent.click(hideEmptyCheckbox);

    // Empty server (srv-2 with 0 players) should now be filtered out
    await waitFor(() => {
      expect(screen.queryByText('[US] Bad Company 2 Heavy Metal Rush Only')).not.toBeInTheDocument();
      expect(screen.getByText('[EU] Official Titan 24/7 Fast Vehicle Spawn')).toBeInTheDocument();
    });
  });

  it('opens DirectConnectModal when clicking Connect button', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        servers: mockServers,
        count: 3,
        limit: 100,
        offset: 0,
      },
    });

    renderWithProviders(<ServerBrowser />);

    await waitFor(() => {
      expect(screen.getByText('[EU] Official Titan 24/7 Fast Vehicle Spawn')).toBeInTheDocument();
    });

    const connectButtons = screen.getAllByRole('button', { name: /Connect/i });
    fireEvent.click(connectButtons[0]);

    // Modal should be displayed
    await waitFor(() => {
      expect(screen.getByText(/DIRECT CONNECT DIRECTIVE/i)).toBeInTheDocument();
      expect(screen.getByText('+joinServer 198.51.100.10:18275 +playerName "Soldier"')).toBeInTheDocument();
    });
  });

  it('opens ServerDetailModal when clicking on a server row', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
      if (url.includes('/servers/srv-1')) {
        return Promise.resolve({
          data: {
            server: mockServers[0],
            scoreboard: mockServers[0].details?.players,
            rules: mockServers[0].details?.rules,
          },
        });
      }
      return Promise.resolve({
        data: {
          servers: mockServers,
          count: 3,
          limit: 100,
          offset: 0,
        },
      });
    });

    renderWithProviders(<ServerBrowser />);

    await waitFor(() => {
      expect(screen.getByText('[EU] Official Titan 24/7 Fast Vehicle Spawn')).toBeInTheDocument();
    });

    // Click server row
    fireEvent.click(screen.getByText('[EU] Official Titan 24/7 Fast Vehicle Spawn'));

    // Detail Modal should display live scoreboard
    await waitFor(() => {
      expect(screen.getByText(/LIVE THEATER SCOREBOARD/i)).toBeInTheDocument();
      expect(screen.getByText('CommanderVanguard')).toBeInTheDocument();
      expect(screen.getByText('PAC_Infiltrator')).toBeInTheDocument();
      expect(screen.getByText(/United States Marine Corps \(USMC\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Imperial Japanese Army \(IJA\)/i)).toBeInTheDocument();
    });
  });
});

describe('Module 4: DirectConnectModal & ServerDetailModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('DirectConnectModal renders launch argument copy formats', () => {
    renderWithProviders(
      <DirectConnectModal
        isOpen={true}
        onClose={vi.fn()}
        server={mockServers[0]}
        initialSoldierName="VanguardCaptain"
      />
    );

    expect(screen.getByText(/DIRECT CONNECT DIRECTIVE/i)).toBeInTheDocument();
    expect(screen.getByText('+joinServer 198.51.100.10:18275 +playerName "VanguardCaptain"')).toBeInTheDocument();
    expect(screen.getByText('MOHPA.exe +joinServer 198.51.100.10:18275 +playerName "VanguardCaptain"')).toBeInTheDocument();
    expect(screen.getByText('connect 198.51.100.10:18275')).toBeInTheDocument();
  });

  it('ServerDetailModal renders server details, faction tabs, and rules configuration', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        server: mockServers[0],
        scoreboard: mockServers[0].details?.players,
        rules: mockServers[0].details?.rules,
      },
    });

    renderWithProviders(
      <ServerDetailModal
        isOpen={true}
        onClose={vi.fn()}
        server={mockServers[0]}
      />
    );

    expect(screen.getByText('[EU] Official Titan 24/7 Fast Vehicle Spawn')).toBeInTheDocument();
    expect(screen.getByText(/THEATER SECTOR/i)).toBeInTheDocument();
    expect(screen.getByText(/Suez Canal 2142/i)).toBeInTheDocument();
    expect(screen.getByText(/SOLDIER CAPACITY/i)).toBeInTheDocument();

    // Switch to Rules Tab
    const rulesTab = screen.getByRole('button', { name: /Rules/i });
    fireEvent.click(rulesTab);

    await waitFor(() => {
      expect(screen.getByText(/SERVER RULES & CVAR CONFIGURATION/i)).toBeInTheDocument();
      expect(screen.getByText('titanShieldTime')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
    });
  });

  it('correctly resolves 178.105.150.25 to Germany (DE/FRA) and renders accurate telemetry in ServerDetailModal', async () => {
    const germanServer: GameServer = {
      id: 'srv-hetzner',
      name: 'MOHPA is back!',
      gameSlug: 'mohpa',
      ipAddress: '178.105.150.25',
      port: 13200,
      queryPort: 13300,
      isRanked: true,
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
      maxPlayers: 16,
      currentPlayers: 0,
      mapName: 'mp_airfield_inv',
      gameMode: 'Invader',
      ping: 92,
      tickRate: 30,
      details: {
        ping: 92,
        tickRate: 30,
        players: [],
        rules: {
          gamever: '1.2',
          dedicated: '1',
        },
      },
    };

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        server: germanServer,
        scoreboard: [],
        rules: germanServer.details?.rules,
      },
    });

    renderWithProviders(
      <ServerDetailModal
        isOpen={true}
        onClose={vi.fn()}
        server={germanServer}
      />
    );

    // Verify Germany flag and Frankfurt region (NOT USA or IAD)
    expect(screen.getByText('🇩🇪')).toBeInTheDocument();
    expect(screen.queryByText('🇺🇸')).not.toBeInTheDocument();
    expect(screen.getByText('FRA')).toBeInTheDocument();
    expect(screen.queryByText('IAD')).not.toBeInTheDocument();

    // Verify live measured ping (92ms) is displayed instead of hardcoded 28ms
    expect(screen.getByText('(92ms)')).toBeInTheDocument();
    expect(screen.queryByText('(28ms)')).not.toBeInTheDocument();

    // Verify human-readable MOHPA map name and mode
    expect(screen.getByText('Henderson Airfield (Invader)')).toBeInTheDocument();
    expect(screen.queryByText('Suez Canal 2142')).not.toBeInTheDocument();
    expect(screen.getByText('Invader')).toBeInTheDocument();
    expect(screen.queryByText('Titan / Conquest')).not.toBeInTheDocument();

    // Verify target address & tick rate
    expect(screen.getByText('178.105.150.25:13200')).toBeInTheDocument();
    expect(screen.getByText('30 Hz Tick')).toBeInTheDocument();
  });
});

