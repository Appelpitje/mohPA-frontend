import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Server,
  ArrowLeft,
  RefreshCw,
  Zap,
  Copy,
  Check,
  Signal,
  Users,
  Activity,
  TrendingUp,
  MapPin,
  Clock,
} from 'lucide-react';
import { ServerHistoryRange } from '../../types/server';
import serverService from '../../services/serverService';
import { getRegionInfo, GAME_METADATA, formatMapName, formatGameMode } from '../../utils/gameMaps';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ServerHistoryChart } from '../../components/servers/ServerHistoryChart';
import { ServerWhoPlayedTable } from '../../components/servers/ServerWhoPlayedTable';
import { ServerMapDistribution } from '../../components/servers/ServerMapDistribution';
import { DirectConnectModal } from '../../components/servers/DirectConnectModal';
import { useToast } from '../../components/hud/Toast';
import { cn } from '../../utils/cn';

export const ServerHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [range, setRange] = useState<ServerHistoryRange>('24h');
  const [copiedIp, setCopiedIp] = useState(false);
  const [directConnectOpen, setDirectConnectOpen] = useState(false);

  const {
    data: historyData,
    isLoading,
    refetch,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['server-history', id, range],
    queryFn: () => (id ? serverService.getServerHistory(id, range) : null),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const server = historyData?.server;
  const summary = historyData?.summary;
  const chart = historyData?.chart || [];
  const players = historyData?.players || [];

  const targetAddress = server ? `${server.ipAddress}:${server.port}` : '';
  const gameMeta = server ? GAME_METADATA[server.gameSlug] : null;
  const region = server
    ? getRegionInfo(
        server.region || server.details?.region || server.countryCode || server.details?.countryCode,
        server.ipAddress
      )
    : null;

  const copyIp = async () => {
    if (!targetAddress) return;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(targetAddress);
      }
      setCopiedIp(true);
      toast.success('Address Copied', `${targetAddress} copied to clipboard.`);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {
      toast.error('Copy Failed', 'Could not copy to clipboard.');
    }
  };

  if (isLoading && !historyData) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center space-y-3 font-mono">
        <span className="inline-block animate-spin w-6 h-6 border-2 border-olive-600 border-t-transparent rounded-full" />
        <p className="text-sm text-ink-muted">Loading server history & analytics…</p>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center space-y-4 font-mono">
        <Server className="w-10 h-10 text-crimson-600 mx-auto opacity-70" />
        <h2 className="text-lg font-bold text-ink">Server Not Found</h2>
        <p className="text-xs text-ink-muted">
          Could not retrieve historical statistics for server ID: {id}
        </p>
        <Link to="/servers">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Server Browser
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {/* Breadcrumbs Navigation */}
      <div className="flex items-center space-x-2 text-xs font-mono text-ink-muted">
        <Link to="/servers" className="hover:text-olive-700 transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          Servers
        </Link>
        <span>/</span>
        <span className="text-ink truncate max-w-xs">{server.name}</span>
        <span>/</span>
        <span className="text-olive-700 font-semibold">History & Stats</span>
      </div>

      {/* Main Server Header Card */}
      <div className="bg-sand-50 border border-sand-200 rounded-xl p-5 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-semibold text-xl tracking-tight text-ink uppercase">
                {server.name}
              </h1>
              <Badge variant="CYAN" size="sm">
                {gameMeta?.shortTitle || server.gameSlug.toUpperCase()}
              </Badge>
              {server.isRanked ? (
                <Badge variant="RANKED" size="sm">
                  RANKED
                </Badge>
              ) : (
                <Badge variant="DEFAULT" size="sm">
                  UNRANKED
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted">
              {/* Online indicator */}
              <div className="flex items-center space-x-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  {server.isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-olive-500 opacity-75" />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-2.5 w-2.5',
                      server.isOnline ? 'bg-olive-600' : 'bg-crimson-600'
                    )}
                  />
                </span>
                <span className={cn('font-bold', server.isOnline ? 'text-olive-700' : 'text-crimson-700')}>
                  {server.isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* IP / Port */}
              <div className="flex items-center space-x-1 text-ink">
                <Signal className="w-3.5 h-3.5 text-olive-600" />
                <span>{targetAddress}</span>
                <button
                  type="button"
                  onClick={copyIp}
                  className="p-1 rounded hover:bg-sand-200 transition-colors"
                  title="Copy IP:Port"
                >
                  {copiedIp ? (
                    <Check className="w-3 h-3 text-olive-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-ink-muted" />
                  )}
                </button>
              </div>

              {/* Region */}
              {region && (
                <div className="flex items-center space-x-1 text-ink">
                  <span>{region.flag}</span>
                  <span>{region.name}</span>
                </div>
              )}

              {/* Current Map */}
              {server.mapName && (
                <div className="flex items-center space-x-1 text-ink">
                  <MapPin className="w-3.5 h-3.5 text-olive-600" />
                  <span>{formatMapName(server.mapName, server.gameSlug)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 self-start md:self-auto">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', isFetching ? 'animate-spin' : '')} />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Zap className="w-3.5 h-3.5" />}
              onClick={() => setDirectConnectOpen(true)}
            >
              Direct Connect
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Summary Telemetry KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl shadow-soft">
          <span className="text-xs text-ink-muted block font-mono flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-olive-600" />
            Current Soldiers
          </span>
          <span className="font-semibold text-xl text-ink font-mono mt-1 block">
            {server.currentPlayers || 0}
            <span className="text-xs text-ink-muted font-normal"> / {server.maxPlayers || 32}</span>
          </span>
        </div>

        <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl shadow-soft">
          <span className="text-xs text-ink-muted block font-mono flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            Peak Players ({range})
          </span>
          <span className="font-semibold text-xl text-amber-600 font-mono mt-1 block">
            {summary?.peakPlayers ?? 0}
          </span>
          {summary?.peakPlayersTime && (
            <span className="text-[10px] text-ink-muted font-mono block mt-0.5 truncate">
              {new Date(summary.peakPlayersTime).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl shadow-soft">
          <span className="text-xs text-ink-muted block font-mono flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-olive-600" />
            Average Players
          </span>
          <span className="font-semibold text-xl text-olive-700 font-mono mt-1 block">
            {summary?.averagePlayers ?? 0}
          </span>
          <span className="text-[10px] text-ink-muted font-mono block mt-0.5">
            {summary?.uniquePlayersCount ?? 0} unique combatants
          </span>
        </div>

        <div className="p-4 bg-sand-50 border border-sand-200 rounded-xl shadow-soft">
          <span className="text-xs text-ink-muted block font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-olive-600" />
            Server Uptime
          </span>
          <span className="font-semibold text-xl text-ink font-mono mt-1 block">
            {summary?.uptimePercentage ?? 100}%
          </span>
          <span className="text-[10px] text-ink-muted font-mono block mt-0.5">
            {summary?.totalSessions ?? 0} total sessions
          </span>
        </div>
      </div>

      {/* Interactive GameTracker-style SVG Chart */}
      {summary && (
        <ServerHistoryChart
          chart={chart}
          summary={summary}
          range={range}
          onRangeChange={(newRange) => setRange(newRange)}
          maxCapacity={server.maxPlayers || 32}
          isLoading={isFetching}
        />
      )}

      {/* Map Rotation & Who Played Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Rotation Breakdown */}
        <div className="lg:col-span-1">
          <ServerMapDistribution
            topMaps={summary?.topMaps || []}
            gameSlug={server.gameSlug}
          />
        </div>

        {/* Historical Players ("Who Played") */}
        <div className="lg:col-span-2">
          <ServerWhoPlayedTable
            players={players}
            isLoading={isFetching}
          />
        </div>
      </div>

      {/* Direct Connect Modal */}
      {directConnectOpen && (
        <DirectConnectModal
          isOpen={directConnectOpen}
          onClose={() => setDirectConnectOpen(false)}
          server={server}
        />
      )}
    </div>
  );
};

export default ServerHistory;
