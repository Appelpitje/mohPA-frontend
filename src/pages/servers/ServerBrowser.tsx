import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Server,
  RefreshCw,
  MapPin,
  Users,
  Activity,
  Zap,
  Plus,
  Radio,
  Globe,
} from 'lucide-react';
import { GameServer, ServerFilter } from '../../types/server';
import serverService from '../../services/serverService';
import { getRegionInfo, GAME_METADATA, formatMapName, formatGameMode } from '../../utils/gameMaps';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DataTable, Column } from '../../components/common/DataTable';
import { ServerFilters, ServerFilterState } from '../../components/servers/ServerFilters';
import { ServerDetailModal } from './ServerDetailModal';
import { DirectConnectModal } from '../../components/servers/DirectConnectModal';
import { RegisterServerModal } from '../../components/servers/RegisterServerModal';
import { cn } from '../../utils/cn';

export const ServerBrowser: React.FC = () => {
  // Auto-refresh state (every 10s via React Query refetchInterval)
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters state
  const [filters, setFilters] = useState<ServerFilterState>({
    search: '',
    gameSlug: '', // default to all games, or user can choose specific game
    mapName: '',
    isRanked: false,
    isOfficial: false,
    hideEmpty: false,
    hideFull: false,
  });

  // Modals state
  const [selectedServer, setSelectedServer] = useState<GameServer | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [directConnectServer, setDirectConnectServer] = useState<GameServer | null>(null);
  const [directConnectOpen, setDirectConnectOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Query server list with backend params
  const {
    data: responseData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['servers', filters.gameSlug, filters.isRanked, filters.mapName, filters.search],
    queryFn: async () => {
      const apiFilter: ServerFilter = {};
      if (filters.gameSlug) apiFilter.gameSlug = filters.gameSlug;
      if (filters.isRanked) apiFilter.isRanked = true;
      if (filters.mapName) apiFilter.mapName = filters.mapName;
      if (filters.search) apiFilter.search = filters.search;
      apiFilter.limit = 100;

      return await serverService.getServers(apiFilter);
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const rawServers = responseData?.servers || [];

  // Available map names extracted from current servers
  const availableMaps = useMemo(() => {
    const set = new Set<string>();
    rawServers.forEach((s) => {
      if (s.mapName) set.add(s.mapName);
    });
    return Array.from(set);
  }, [rawServers]);

  // Client-side filtering for Hide Empty, Hide Full, Official, and client search if needed
  const filteredServers = useMemo(() => {
    return rawServers.filter((srv) => {
      const cur = srv.currentPlayers ?? (srv.details?.players ? srv.details.players.length : 0);
      const max = srv.maxPlayers ?? 64;

      // 1. Hide empty
      if (filters.hideEmpty && cur === 0) {
        return false;
      }

      // 2. Hide full
      if (filters.hideFull && cur >= max) {
        return false;
      }

      // 3. Official only
      if (filters.isOfficial && !srv.isOfficial && !srv.details?.isOfficial) {
        return false;
      }

      // 4. Client-side search fallback (matches name, IP, map, mode)
      if (filters.search) {
        const query = filters.search.toLowerCase().trim();
        const matchesName = srv.name.toLowerCase().includes(query);
        const matchesIp = `${srv.ipAddress}:${srv.port}`.includes(query);
        const matchesMap = srv.mapName?.toLowerCase().includes(query);
        const matchesMode = srv.gameMode?.toLowerCase().includes(query);
        if (!matchesName && !matchesIp && !matchesMap && !matchesMode) {
          return false;
        }
      }

      return true;
    });
  }, [rawServers, filters]);

  // Global Telemetry calculations
  const telemetry = useMemo(() => {
    const totalServers = rawServers.length;
    const onlineServers = rawServers.filter((s) => s.isOnline).length;
    const activePlayers = rawServers.reduce((sum, s) => sum + (s.currentPlayers || 0), 0);
    const totalCapacity = rawServers.reduce((sum, s) => sum + (s.maxPlayers || 64), 0);

    return {
      totalServers,
      onlineServers,
      activePlayers,
      totalCapacity,
    };
  }, [rawServers]);

  const handleFilterUpdate = (updates: Partial<ServerFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      gameSlug: '',
      mapName: '',
      isRanked: false,
      isOfficial: false,
      hideEmpty: false,
      hideFull: false,
    });
  };

  const handleOpenDetails = (server: GameServer) => {
    setSelectedServer(server);
    setDetailModalOpen(true);
  };

  const handleOpenDirectConnect = (e: React.MouseEvent, server: GameServer) => {
    e.stopPropagation();
    setDirectConnectServer(server);
    setDirectConnectOpen(true);
  };

  // Table column configuration
  const columns: Column<GameServer>[] = [
    {
      key: 'isOnline',
      header: 'Status',
      width: '70px',
      align: 'center',
      sortable: true,
      sortValue: (srv) => (srv.isOnline ? 1 : 0),
      render: (srv) => (
        <div className="flex items-center justify-center">
          <span className="relative flex h-2.5 w-2.5">
            {srv.isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-olive-500 opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex rounded-full h-2.5 w-2.5',
                srv.isOnline ? 'bg-olive-600' : 'bg-stamp-500'
              )}
            />
          </span>
        </div>
      ),
    },
    {
      key: 'gameSlug',
      header: 'Game',
      width: '110px',
      sortable: true,
      render: (srv) => {
        const meta = GAME_METADATA[srv.gameSlug];
        const shortName = meta?.shortTitle || srv.gameSlug.toUpperCase();
        return (
          <Badge variant="CYAN" size="sm" className="truncate max-w-[100px]">
            {shortName}
          </Badge>
        );
      },
    },
    {
      key: 'name',
      header: 'Server',
      sortable: true,
      render: (srv) => {
        const region = getRegionInfo(
          srv.region || srv.details?.region || srv.countryCode || srv.details?.countryCode,
          srv.ipAddress
        );
        return (
          <div className="flex flex-col space-y-0.5 py-0.5 group">
            <div className="flex items-center space-x-1.5 font-semibold text-ink group-hover:text-olive-700 transition-colors">
              <span className="truncate max-w-xs md:max-w-md">{srv.name}</span>
              {srv.isRanked && (
                <Badge variant="RANKED" size="sm" className="hidden sm:inline-flex">
                  RANKED
                </Badge>
              )}
              {srv.isOfficial && (
                <Badge variant="OFFICIAL" size="sm" className="hidden sm:inline-flex">
                  OFFICIAL
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-ink-muted">
              <span className="font-mono text-ink-muted">
                {srv.ipAddress}:{srv.port}
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1 text-ink-muted" title={region.name}>
                <span>{region.flag}</span>
                <span className="uppercase">{region.code.toUpperCase()}</span>
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'mapName',
      header: 'Map',
      sortable: true,
      render: (srv) => (
        <div className="flex items-center space-x-1.5 text-ink">
          <MapPin className="w-3.5 h-3.5 text-olive-600 shrink-0" />
          <span className="truncate max-w-[130px]" title={formatMapName(srv.mapName, srv.gameSlug)}>
            {formatMapName(srv.mapName, srv.gameSlug)}
          </span>
        </div>
      ),
    },
    {
      key: 'gameMode',
      header: 'Mode',
      sortable: true,
      render: (srv) => (
        <span className="text-ink font-mono text-[11px] uppercase truncate block max-w-[110px]" title={formatGameMode(srv.gameMode, srv.gameSlug)}>
          {formatGameMode(srv.gameMode, srv.gameSlug)}
        </span>
      ),
    },
    {
      key: 'currentPlayers',
      header: 'Players',
      width: '130px',
      sortable: true,
      sortValue: (srv) => srv.currentPlayers || 0,
      render: (srv) => {
        const cur = srv.currentPlayers || 0;
        const max = srv.maxPlayers || 64;
        const percent = Math.min(100, Math.round((cur / Math.max(1, max)) * 100));

        const barColor =
          percent >= 100 ? 'bg-stamp-500' : percent >= 80 ? 'bg-amber-400' : 'bg-olive-600';

        return (
          <div className="flex flex-col space-y-1 w-24">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className={cn('font-bold', cur > 0 ? 'text-olive-700' : 'text-ink-muted')}>
                {cur}
              </span>
              <span className="text-ink-muted">/ {max}</span>
            </div>
            <div className="w-full bg-sand-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', barColor)}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'region',
      header: 'Ping',
      width: '110px',
      sortable: true,
      sortValue: (srv) => srv.ping || srv.details?.ping || 30,
      render: (srv) => {
        const region = getRegionInfo(
          srv.region || srv.details?.region || srv.countryCode || srv.details?.countryCode,
          srv.ipAddress
        );
        const ping = srv.ping ?? srv.details?.ping ?? region.estimatedPing;
        const pingColor =
          ping < 50 ? 'text-olive-700' : ping < 110 ? 'text-amber-500' : 'text-stamp-600';

        return (
          <div className="flex items-center space-x-1.5 font-mono text-[11px]" title={`${region.name} (${ping}ms)`}>
            <span>{region.flag}</span>
            <span className={cn('font-bold', pingColor)}>{ping}ms</span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '240px',
      align: 'right',
      render: (srv) => (
        <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="xs"
            leftIcon={<Zap className="w-3 h-3" />}
            onClick={(e) => handleOpenDirectConnect(e, srv)}
            title="Direct Connect / Launch Arguments"
          >
            Connect
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetails(srv);
            }}
            title="View Scoreboard & Details"
          >
            Scoreboard
          </Button>

          <Link
            to={`/servers/${srv.id}/history`}
            onClick={(e) => e.stopPropagation()}
            title="View Server History & GameTracker Charts"
          >
            <Button
              variant="ghost"
              size="xs"
              leftIcon={<Activity className="w-3 h-3" />}
            >
              History
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Servers</h1>
          <p className="text-sm text-ink-muted mt-1">
            Live Theater servers for Medal of Honor: Pacific Assault.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center space-x-2 px-3 py-1.5 bg-sand-50 border border-sand-200 rounded-lg text-sm text-ink-muted cursor-pointer select-none hover:bg-sand-100">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-sand-300 text-olive-600 focus:ring-olive-500 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <RefreshCw className={cn('w-3.5 h-3.5', autoRefresh && isFetching ? 'animate-spin' : '')} />
              Auto-refresh
            </span>
          </label>

          {/* Quick Refresh Button */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isFetching ? 'animate-spin' : '')} />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Refresh
          </Button>

          {/* Register Server Button */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setRegisterModalOpen(true)}
          >
            Register Server
          </Button>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl shadow-soft">
          <span className="text-xs text-ink-muted block">Online</span>
          <span className="font-semibold text-lg text-ink tabular-nums">
            {telemetry.onlineServers}
            <span className="text-sm text-ink-faint font-normal"> / {telemetry.totalServers}</span>
          </span>
        </div>
        <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl shadow-soft">
          <span className="text-xs text-ink-muted block">Players</span>
          <span className="font-semibold text-lg text-ink tabular-nums">
            {telemetry.activePlayers.toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl shadow-soft">
          <span className="text-xs text-ink-muted block">Capacity</span>
          <span className="font-semibold text-lg text-ink tabular-nums">
            {telemetry.totalCapacity.toLocaleString()}
          </span>
        </div>
        <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl shadow-soft">
          <span className="text-xs text-ink-muted block">Status</span>
          <span className="font-semibold text-lg text-olive-700">Live</span>
        </div>
      </div>

      {/* Filter Bar */}
      <ServerFilters
        filters={filters}
        onFilterChange={handleFilterUpdate}
        onReset={handleResetFilters}
        availableMaps={availableMaps}
        totalCount={rawServers.length}
        filteredCount={filteredServers.length}
      />

      {/* Main Server Table Card */}
      <Card
        title={
          <div className="flex items-center space-x-2">
            <span>Server list</span>
            <Badge variant="CYAN" size="sm">
              {filteredServers.length} online
            </Badge>
          </div>
        }
        subtitle="Click a row for scoreboard and join details."
        icon={<Server className="w-4 h-4" />}
        accent="cyan"
      >
        <DataTable<GameServer>
          columns={columns}
          data={filteredServers}
          keyExtractor={(srv) => srv.id}
          isLoading={isLoading}
          loadingMessage="Loading servers…"
          onRowClick={(srv) => handleOpenDetails(srv)}
          emptyMessage={
            rawServers.length === 0
              ? 'No live servers right now.'
              : 'No servers match these filters.'
          }
        />

        {/* Empty state clear filters helper */}
        {!isLoading && filteredServers.length === 0 && rawServers.length > 0 && (
          <div className="text-center pt-3 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
            >
              Reset Filters & Show All Servers
            </Button>
          </div>
        )}
      </Card>

      {/* Server Detail Modal */}
      {selectedServer && (
        <ServerDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          server={selectedServer}
        />
      )}

      {/* Direct Connect Modal */}
      {directConnectServer && (
        <DirectConnectModal
          isOpen={directConnectOpen}
          onClose={() => setDirectConnectOpen(false)}
          server={directConnectServer}
        />
      )}

      {/* Register Server Modal */}
      {registerModalOpen && (
        <RegisterServerModal
          isOpen={registerModalOpen}
          onClose={() => setRegisterModalOpen(false)}
          onRegistered={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};
