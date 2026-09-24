import React from 'react';
import { MapPin } from 'lucide-react';
import { formatMapName } from '../../utils/gameMaps';

export interface ServerMapDistributionProps {
  topMaps: Array<{ mapName: string; occurrences: number; percentage: number }>;
  gameSlug?: string;
}

export const ServerMapDistribution: React.FC<ServerMapDistributionProps> = ({
  topMaps,
  gameSlug = 'mohpa',
}) => {
  if (!topMaps || topMaps.length === 0) {
    return null;
  }

  return (
    <div className="bg-sand-50 border border-sand-200 rounded-xl p-4 sm:p-5 shadow-soft space-y-3 font-mono">
      <div className="flex items-center justify-between pb-2 border-b border-sand-200">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-olive-600" />
          <h4 className="font-semibold text-xs text-ink uppercase tracking-wider">
            Map Rotation Distribution
          </h4>
        </div>
        <span className="text-[11px] text-ink-muted">
          {topMaps.length} maps tracked
        </span>
      </div>

      <div className="space-y-2.5 pt-1">
        {topMaps.map((m, idx) => {
          const mapDisplay = formatMapName(m.mapName, gameSlug);
          return (
            <div key={`${m.mapName}-${idx}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink truncate max-w-[200px]" title={mapDisplay}>
                  {mapDisplay}
                </span>
                <span className="text-olive-700 font-bold text-[11px]">
                  {m.percentage}%
                </span>
              </div>
              <div className="w-full bg-sand-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-olive-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(4, m.percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
