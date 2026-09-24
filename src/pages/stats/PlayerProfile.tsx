import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Crosshair,
  Award,
  Clock,
  UserPlus,
  GitCompare,
  ArrowLeft,
  Calendar,
  Share2,
  CheckCircle2,
  AlertCircle,
  Target,
  Search,
} from 'lucide-react';
import { statsService } from '../../services/statsService';
import { GAMES } from '../../types/game';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { MetricCard } from '../../components/hud/MetricCard';
import { Modal } from '../../components/common/Modal';
import { cn } from '../../utils/cn';

export const PlayerProfile: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const gameParam = searchParams.get('game') || undefined;

  // Comparison & Social Modals
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [friendRequested, setFriendRequested] = useState(false);
  const [lookupName, setLookupName] = useState('');

  // Fetch Player Profile & Dossier
  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery({
    queryKey: ['playerProfile', name, gameParam],
    queryFn: () => statsService.getPlayerProfile(name || '', gameParam),
    enabled: !!name,
    retry: 1,
  });

  const persona = profileData?.persona;
  const stats = profileData?.stats;
  const gameSlug = persona?.gameSlug || gameParam || 'mohpa';
  const gameConfig = GAMES.find((g) => g.slug === gameSlug) || GAMES[0];

  // Calculate Military Rank Grade
  const score = stats?.score || 0;
  const kills = stats?.kills || 0;
  const deaths = stats?.deaths || 0;
  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const timePlayedSeconds = stats?.timePlayedSeconds || 0;

  const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? `${kills}.00` : '0.00';
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0';
  const combatHours = (timePlayedSeconds / 3600).toFixed(1);
  const combatTimeFormatted =
    timePlayedSeconds >= 3600
      ? `${combatHours} hrs`
      : `${Math.round(timePlayedSeconds / 60)} mins`;

  const getMilitaryRank = (scoreVal: number) => {
    if (scoreVal >= 500000) return { title: 'Supreme Commander', grade: 'OF-10', insignia: '★★★★★', color: 'text-amber-400', border: 'border-amber-500/60' };
    if (scoreVal >= 250000) return { title: 'General of the Army', grade: 'OF-9', insignia: '★★★★', color: 'text-amber-400', border: 'border-amber-500/60' };
    if (scoreVal >= 100000) return { title: 'Brigadier General', grade: 'OF-6', insignia: '★★★', color: 'text-amber-500', border: 'border-amber-600/60' };
    if (scoreVal >= 50000) return { title: 'Colonel', grade: 'OF-5', insignia: '★★', color: 'text-cyan-400', border: 'border-cyan-500/60' };
    if (scoreVal >= 25000) return { title: 'Major', grade: 'OF-3', insignia: '★', color: 'text-cyan-400', border: 'border-cyan-500/60' };
    if (scoreVal >= 10000) return { title: 'Captain', grade: 'OF-2', insignia: 'CAP', color: 'text-emerald-400', border: 'border-emerald-500/60' };
    if (scoreVal >= 5000) return { title: 'Lieutenant', grade: 'OF-1', insignia: 'LT', color: 'text-emerald-400', border: 'border-emerald-500/60' };
    if (scoreVal >= 1000) return { title: 'Master Sergeant', grade: 'OR-8', insignia: 'SGT', color: 'text-ink', border: 'border-gray-500/60' };
    return { title: 'Private First Class', grade: 'OR-2', insignia: 'PFC', color: 'text-ink-muted', border: 'border-gray-600/60' };
  };

  const rankInfo = getMilitaryRank(score);

  const customStats = stats?.customStats || {};
  const careerRows = [
    { label: 'Kills', value: kills },
    { label: 'Deaths', value: deaths },
    { label: 'Team bonus', value: score },
    { label: 'Time', value: timePlayedSeconds },
    ...Object.entries(customStats).flatMap(([key, raw]) => {
      const value = typeof raw === 'number' ? raw : typeof raw === 'string' && /^-?\d+$/.test(raw) ? Number(raw) : Number.NaN;
      if (!Number.isFinite(value)) return [];
      return [{ label: key, value }];
    }),
  ].filter((row) => row.value !== 0);

  // Handle Share Link
  const handleShareLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Handle Add Friend
  const handleAddFriend = () => {
    setFriendRequested(true);
    setTimeout(() => setFriendRequested(false), 4000);
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupName.trim()) {
      navigate(`/stats/player/${encodeURIComponent(lookupName.trim())}`);
    }
  };

  // Loading State
  if (isProfileLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto">
        <p className="text-sm font-medium text-ink">Loading soldier…</p>
        <div className="h-8 w-48 bg-sand-300 rounded" />
        <div className="h-48 bg-sand-50 border border-sand-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-sand-50 border border-sand-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-sand-50 border border-sand-200 rounded-xl" />
      </div>
    );
  }

  // Not Found / Error State
  if (isProfileError || !persona) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12 text-center animate-fade-in">
        <div className="bg-sand-50 border border-sand-200 rounded-xl p-8 shadow-soft space-y-4">
          <div className="w-12 h-12 bg-olive-50 rounded-full flex items-center justify-center mx-auto text-olive-700">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Soldier not found
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              No record for <span className="font-medium text-ink">“{name}”</span>.
            </p>
          </div>

          <form onSubmit={handleLookupSubmit} className="flex gap-2 max-w-md mx-auto pt-2">
            <input
              type="text"
              value={lookupName}
              onChange={(e) => setLookupName(e.target.value)}
              placeholder="Search soldier callsign..."
              className="flex-1 bg-sand-50 border border-sand-300 text-ink placeholder-ink-faint rounded-sm text-xs font-mono px-3 py-2 focus:outline-none focus:border-cyan-500"
            />
            <Button type="submit" variant="primary" size="sm" leftIcon={<Search className="w-3.5 h-3.5" />}>
              Search
            </Button>
          </form>

          <div className="pt-4 border-t border-sand-200">
            <Link to="/leaderboards">
              <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Return to Global Leaderboards
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const enlistmentDate = persona.createdAt
    ? new Date(persona.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'CLASSIFIED';

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Navigation Breadcrumb & Back button */}
      <div className="flex items-center justify-between">
        <Link
          to={`/leaderboards?game=${gameSlug}`}
          className="inline-flex items-center space-x-1.5 text-xs font-mono text-ink-muted hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO {gameConfig.name.toUpperCase()} LEADERBOARD</span>
        </Link>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="xs"
            leftIcon={copiedLink ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
            onClick={handleShareLink}
          >
            {copiedLink ? 'Link Copied' : 'Share Dossier'}
          </Button>
        </div>
      </div>

      {/* Header Banner: Soldier Dossier Hero */}
      <div className="hud-card p-6 relative overflow-hidden">
        {/* Background Cyber Graphic Overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-cyan-950/30 to-transparent pointer-events-none" />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-cyan-500/10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          {/* Left: Callsign & Military Rank */}
          <div className="flex items-start space-x-4">
            {/* Rank Crest Avatar */}
            <div className={cn('w-16 h-16 rounded-sm bg-sand-50 border flex flex-col items-center justify-center p-1 shadow-inner', rankInfo.border)}>
              <span className={cn('font-mono text-xs font-black tracking-tighter', rankInfo.color)}>
                {rankInfo.insignia}
              </span>
              <span className="text-[10px] font-mono text-ink-muted font-bold mt-0.5">
                {rankInfo.grade}
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h1 className="font-hud font-black text-3xl tracking-wide text-ink uppercase">
                  {persona.name}
                </h1>
                <Badge variant="CYAN">{gameConfig.name}</Badge>
                {persona.isActive ? (
                  <Badge variant="ONLINE">ACTIVE OPERATIVE</Badge>
                ) : (
                  <Badge variant="OFFLINE">STANDBY</Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 mt-2 text-xs font-mono text-ink-muted flex-wrap gap-y-1">
                <span className={cn('font-bold', rankInfo.color)}>
                  {rankInfo.title} ({rankInfo.grade})
                </span>
                <span className="text-carbon-600">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                  Enlisted: <span className="text-ink font-medium">{enlistmentDate}</span>
                </span>
                <span className="text-carbon-600">•</span>
                <span className="font-mono text-[10px] text-ink-muted bg-sand-50 px-1.5 py-0.5 rounded border border-sand-200">
                  ID: {persona.id ? `${persona.id.slice(0, 8)}...` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center space-x-2.5">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={handleAddFriend}
              disabled={friendRequested}
            >
              {friendRequested ? 'Transmission Sent' : 'Add as Friend'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<GitCompare className="w-3.5 h-3.5" />}
              onClick={() => setIsCompareOpen(true)}
            >
              Compare Stats
            </Button>
          </div>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Score */}
        <MetricCard
          title="TOTAL COMBAT SCORE"
          value={score.toLocaleString()}
          subtitle={`Rank Grade: ${rankInfo.grade}`}
          icon={<Trophy className="w-4 h-4 text-cyan-400" />}
          accentColor="cyan"
        />

        {/* K/D Ratio with Visual Bar */}
        <div className="hud-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                KILL / DEATH EFFICIENCY
              </span>
              <div className="p-2 rounded-sm border border-olive-200 bg-olive-50 text-olive-700 shrink-0">
                <Crosshair className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div className="font-hud font-bold text-2xl text-emerald-400">
                {kdRatio}
              </div>
              <span className="font-mono text-[11px] text-ink-muted">
                {kills.toLocaleString()} K / {deaths.toLocaleString()} D
              </span>
            </div>
          </div>

          {/* K/D Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-sand-50 rounded-full h-1.5 overflow-hidden border border-sand-200 flex">
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${kills + deaths > 0 ? (kills / (kills + deaths)) * 100 : 50}%`,
                }}
              />
              <div
                className="bg-crimson-500 h-full"
                style={{
                  width: `${kills + deaths > 0 ? (deaths / (kills + deaths)) * 100 : 50}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-ink-muted mt-1">
              <span className="text-emerald-400">Kills</span>
              <span className="text-crimson-400">Deaths</span>
            </div>
          </div>
        </div>

        {/* Win / Loss Record with Gauge */}
        <div className="hud-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted font-medium">
                WIN / LOSS RECORD
              </span>
              <div className="p-2 rounded-sm border border-sand-300 bg-sand-100 text-amber-600 shrink-0">
                <Award className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div className="font-hud font-bold text-2xl text-amber-400">
                {winRate}%
              </div>
              <span className="font-mono text-[11px] text-ink-muted">
                {wins.toLocaleString()} W / {losses.toLocaleString()} L
              </span>
            </div>
          </div>

          {/* Win Rate Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-sand-50 rounded-full h-1.5 overflow-hidden border border-sand-200">
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, +winRate))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-ink-muted mt-1">
              <span className="text-amber-400">{wins} Wins</span>
              <span className="text-ink-muted">{totalMatches} Matches</span>
            </div>
          </div>
        </div>

        {/* Total Combat Hours */}
        <MetricCard
          title="TOTAL COMBAT TIME"
          value={combatTimeFormatted}
          subtitle={
            timePlayedSeconds >= 3600
              ? `${Math.round(timePlayedSeconds / 60).toLocaleString()} mins deployed`
              : `${timePlayedSeconds}s deployed (${(timePlayedSeconds / 3600).toFixed(2)} hrs)`
          }
          icon={<Clock className="w-4 h-4 text-cyan-400" />}
          accentColor="cyan"
        />
      </div>

      <Card
        title="CAREER RECORD"
        subtitle="Kills, deaths, team bonus, time, and stored career keys"
        icon={<Target className="w-4 h-4 text-cyan-400" />}
        accent="cyan"
      >
        {careerRows.length === 0 ? (
          <p className="font-mono text-xs text-ink-muted">No career stats recorded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {careerRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between bg-sand-50 border border-sand-200 px-3 py-2 rounded-sm font-mono text-xs"
              >
                <span className="text-ink-muted">{row.label}</span>
                <span className="text-ink font-semibold">
                  {row.label === 'Time'
                    ? `${row.value.toLocaleString()}s (${Math.round(Number(row.value) / 60)}m)`
                    : row.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Compare Stats Modal */}
      <Modal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        title={`COMPARISON // ${persona.name.toUpperCase()} VS BENCHMARKS`}
        size="lg"
      >
        <div className="space-y-4 font-mono text-xs">
          <p className="text-ink-muted">
            Compare operative telemetry against sector averages and top-tier veterans.
          </p>

          <div className="grid grid-cols-3 gap-2 text-center p-3 bg-sand-50 border border-sand-200 rounded-sm font-semibold">
            <div className="text-ink-muted text-left">METRIC</div>
            <div className="text-cyan-400">{persona.name.toUpperCase()}</div>
            <div className="text-amber-400">SECTOR AVG</div>
          </div>

          <div className="space-y-2">
            {[
              { metric: 'Score per Minute', player: `${(score / Math.max(1, timePlayedSeconds / 60)).toFixed(0)} SPM`, avg: '340 SPM' },
              { metric: 'K/D Ratio', player: kdRatio, avg: '1.15' },
              { metric: 'Win Rate', player: `${winRate}%`, avg: '50.2%' },
              { metric: 'Combat Experience', player: `${combatHours} hrs`, avg: '18.4 hrs' },
              { metric: 'Rank Classification', player: rankInfo.grade, avg: 'OR-4' },
            ].map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-2 p-2.5 bg-sand-100 border border-sand-200 rounded-sm text-center"
              >
                <div className="text-left text-ink font-medium">{row.metric}</div>
                <div className="text-cyan-300 font-bold">{row.player}</div>
                <div className="text-ink-muted">{row.avg}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <Button variant="secondary" size="sm" onClick={() => setIsCompareOpen(false)}>
              Close Comparison
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlayerProfile;
