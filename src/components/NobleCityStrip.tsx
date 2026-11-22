import React from 'react';
import { getCityArt, getNobleArt } from '../art/assets';
import { getPlayerBonuses } from '../engine/payment';
import { CityTile, GEM_COLORS, Noble, PlayerState } from '../engine/types';

interface NobleCityStripProps {
  citiesMode: boolean;
  nobles: Noble[];
  cities: CityTile[];
  activePlayer: PlayerState;
  highlightReserveNoble?: boolean;
  onSelectNoble?: (nobleId: string) => void;
}

/**
 * Steam-exact far-right vertical column of floating Noble portrait tiles (or European City plaques)
 * sitting directly on the velvet felt with clean rounded-square bonus pips and bold corner points.
 */
export const NobleCityStrip: React.FC<NobleCityStripProps> = ({
  citiesMode,
  nobles,
  cities,
  activePlayer,
  highlightReserveNoble = false,
  onSelectNoble,
}) => {
  const bonuses = getPlayerBonuses(activePlayer);

  if (citiesMode) {
    return (
      <aside className="steam-nobles-col steam-nobles-col--cities" aria-label="名城目标">
        {cities.map((city) => {
          const reqs = GEM_COLORS.filter((c) => city.requirement.bonuses[c] > 0);
          return (
            <div
              key={city.id}
              className="steam-city-tile"
              title={`${city.name} · ${city.subtitle}（需 ${city.requirement.minPoints} 分）`}
            >
              <img src={getCityArt(city)} alt="" className="steam-city-tile__art" draggable={false} />
              <div className="steam-city-tile__scrim" />
              <div className="steam-city-tile__body">
                <div className="steam-city-tile__head">
                  <span className="steam-city-tile__pts">{city.requirement.minPoints}</span>
                  <span className="steam-city-tile__name">{city.name}</span>
                </div>
                <div className="steam-city-tile__reqs">
                  {reqs.map((c) => {
                    const met = bonuses[c] >= city.requirement.bonuses[c];
                    return (
                      <span
                        key={c}
                        className={`steam-req-pip steam-req-pip--${c} ${met ? 'steam-req-pip--met' : ''}`}
                      >
                        {city.requirement.bonuses[c]}
                      </span>
                    );
                  })}
                  {city.requirement.anyColorCount && (
                    <span className="steam-req-pip steam-req-pip--any">
                      {city.requirement.anyColorDistinct && city.requirement.anyColorDistinct > 1
                        ? `${city.requirement.anyColorDistinct}×${city.requirement.anyColorCount}`
                        : `${city.requirement.anyColorCount}同`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </aside>
    );
  }

  return (
    <aside className="steam-nobles-col" aria-label="贵族板块">
      {nobles.map((noble) => {
        const reqs = GEM_COLORS.filter((c) => noble.requirements[c] > 0);
        return (
          <button
            key={noble.id}
            type="button"
            onClick={() => onSelectNoble?.(noble.id)}
            className={`steam-noble-tile ${highlightReserveNoble ? 'steam-noble-tile--selectable' : ''}`}
            title={`${noble.name} · ${noble.title}（+${noble.points} 威望）`}
          >
            <img
              src={getNobleArt(noble)}
              alt=""
              className="steam-noble-tile__art"
              draggable={false}
            />
            {/* Steam-Exact Left Requirement Column */}
            <div className="steam-noble-tile__reqs">
              {reqs.map((c) => {
                const met = bonuses[c] >= noble.requirements[c];
                return (
                  <span
                    key={c}
                    className={`steam-req-pip steam-req-pip--${c} ${met ? 'steam-req-pip--met' : ''}`}
                  >
                    {noble.requirements[c]}
                  </span>
                );
              })}
            </div>
            {/* Steam-Exact Bold Gold-White Points Bottom-Right */}
            <span className="steam-noble-tile__pts">{noble.points}</span>
          </button>
        );
      })}
    </aside>
  );
};
