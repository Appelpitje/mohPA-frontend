import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ServerHistoryPlayer } from '../../types/server';
import { cn } from '../../utils/cn';
import {
  Users,
  Search,
  Clock,
  Award,
  Crown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface ServerWhoPlayedTableProps {
  players: ServerHistoryPlayer[];
  isLoading?: boolean;
  onSelectPlayer?: (name: string) => void;
}

type SortField = 'time' | 'score' | 'kills' | 'deaths' | 'kd' | 'lastSeen';

export const ServerWhoPlayedTable: React.FC<ServerWhoPlayedTableProps> = ({
  players,
  isLoading = false,
  onSelectPlayer,
}) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Format seconds into readable hours & minutes (e.g. 2h 45m or 25m)
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '< 1m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format relative time (e.g. 5m ago, 2h ago, 3d ago)
  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let result = [...players];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      let comparison = 0;
      const aKills = a.kills ?? (a.score && a.score > 0 ? a.score : 0);
      const bKills = b.kills ?? (b.score && b.score > 0 ? b.score : 0);
      const aDeaths = a.deaths || 0;
      const bDeaths = b.deaths || 0;

      switch (sortField) {
        case 'time':
          comparison = (b.timePlayedSeconds || 0) - (a.timePlayedSeconds || 0);
          break;
        case 'score':
          comparison = (b.score || 0) - (a.score || 0);
          break;
        case 'kills':
          comparison = bKills - aKills;
          break;
        case 'deaths':
          comparison = bDeaths - aDeaths;
          break;
        case 'kd': {
          const aRatio = aDeaths > 0 ? aKills / aDeaths : aKills;
          const bRatio = bDeaths > 0 ? bKills / bDeaths : bKills;
          comparison = bRatio - aRatio;
          break;
        }
        case 'lastSeen':
          comparison = new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
          break;
      }
      return sortAsc ? -comparison : comparison;
    });

    return result;
  }, [players, search, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / pageSize));
  const paginatedPlayers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPlayers.slice(start, start + pageSize);
  }, [filteredPlayers, page, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-sand-50 border border-sand-200 rounded-xl p-4 sm:p-5 shadow-soft space-y-4">
      {/* Table Header & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-sand-200">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-olive-600" />
          <h3 className="font-semibold text-sm text-ink tracking-tight uppercase">
            Who Played
          </h3>
          <span className="text-xs text-ink-muted font-mono">
            ({filteredPlayers.length} {filteredPlayers.length === 1 ? 'soldier' : 'soldiers'})
          </span>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search soldier callsign…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-paper-50 border border-sand-200 rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-olive-500 font-mono"
          />
        </div>
      </div>

      {/* Players Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs font-mono text-ink-muted">
          Loading player records…
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-sand-300 rounded-lg bg-sand-100/50">
          <Users className="w-6 h-6 text-olive-600 mx-auto mb-2 opacity-60" />
          <p className="text-xs font-medium text-ink">No player activity matches this timeframe.</p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-2 text-xs text-olive-700 underline"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand-200 bg-sand-50">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-sand-100/80 border-b border-sand-200 text-[10px] uppercase tracking-wider text-ink-muted">
                <th className="px-3 py-2.5 w-12 text-center">POS</th>
                <th className="px-3 py-2.5">SOLDIER CALLSIGN</th>
                <th
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort('time')}
                >
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    TIME PLAYED
                    {sortField === 'time' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
                <th
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort('score')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    <Award className="w-3 h-3" />
                    SCORE
                    {sortField === 'score' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
                <th
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort('kills')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    KILLS
                    {sortField === 'kills' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
                <th
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort('deaths')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    DEATHS
                    {sortField === 'deaths' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
                <th
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort('kd')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    K/D
                    {sortField === 'kd' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
                <th className="px-3 py-2.5 text-center">SESSIONS</th>
                <th
                  className="px-3 py-2.5 text-right cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort('lastSeen')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    LAST SEEN
                    {sortField === 'lastSeen' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {paginatedPlayers.map((player, idx) => {
                const overallIdx = (page - 1) * pageSize + idx;
                const kills = player.kills ?? (player.score && player.score > 0 ? player.score : 0);
                const deaths = player.deaths || 0;
                const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? kills.toFixed(2) : '-';

                return (
                  <tr
                    key={`${player.name}-${idx}`}
                    className="hover:bg-sand-100/60 transition-colors"
                  >
                    <td className="px-3 py-2 text-center text-ink-muted font-bold text-[11px]">
                      {overallIdx === 0 ? (
                        <Crown className="w-3.5 h-3.5 text-amber-500 mx-auto" />
                      ) : (
                        `#${overallIdx + 1}`
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center space-x-2">
                        {/* Live Online pulsating indicator */}
                        {player.isOnline ? (
                          <span
                            className="relative flex h-2 w-2"
                            title="Currently online and playing on this server"
                          >
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-olive-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-olive-600" />
                          </span>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-sand-300" title="Offline" />
                        )}

                        <Link
                          to={`/stats/player/${encodeURIComponent(player.name)}`}
                          onClick={(e) => {
                            if (onSelectPlayer) {
                              e.preventDefault();
                              onSelectPlayer(player.name);
                            }
                          }}
                          className="font-semibold text-ink hover:text-olive-700 transition-colors inline-flex items-center gap-1"
                        >
                          <span className="truncate max-w-[150px] sm:max-w-xs">{player.name}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-ink-muted opacity-50" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-olive-700">
                      {formatDuration(player.timePlayedSeconds)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-ink">
                      {(player.score || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-olive-700">
                      {kills.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-crimson-600">
                      {deaths.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-ink">
                      {kdRatio}
                    </td>
                    <td className="px-3 py-2 text-center text-ink-muted">
                      {player.sessionCount || 1}
                    </td>
                    <td
                      className="px-3 py-2 text-right text-ink-muted text-[11px]"
                      title={new Date(player.lastSeen).toLocaleString()}
                    >
                      {formatRelativeTime(player.lastSeen)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-mono text-ink-muted pt-2 border-t border-sand-200">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 rounded bg-sand-100 border border-sand-200 hover:bg-sand-200 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 rounded bg-sand-100 border border-sand-200 hover:bg-sand-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
