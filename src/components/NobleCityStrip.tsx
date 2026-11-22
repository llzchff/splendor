import React from 'react';
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
      <div className="noble-strip">
        <div className="noble-strip__label">名城目标 ({cities.length})</div>
        <div className="noble-strip__items">
          {cities.map((city) => {
            const reqs = GEM_COLORS.filter((c) => city.requirement.bonuses[c] > 0);
            return (
              <div key={city.id} className="city-tile" title={`${city.name} - ${city.subtitle}`}>
                <div className="city-tile__top">
                  <span className="city-tile__pts">{city.requirement.minPoints}分</span>
                  <span className="city-tile__name">{city.name}</span>
                </div>
                <div className="city-tile__reqs">
                  {reqs.map((c) => {
                    const have = bonuses[c];
                    const need = city.requirement.bonuses[c];
                    return (
                      <span
                        key={c}
                        className={`mini-req mini-req--${c} ${have >= need ? 'mini-req--met' : ''}`}
                      >
                        {need}
                      </span>
                    );
                  })}
                  {city.requirement.anyColorCount && (
                    <span className="mini-req mini-req--any">
                      {city.requirement.anyColorDistinct && city.requirement.anyColorDistinct > 1
                        ? `${city.requirement.anyColorDistinct}×${city.requirement.anyColorCount}同色`
                        : `${city.requirement.anyColorCount}同色`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="noble-strip">
      <div className="noble-strip__label">贵族 ({nobles.length})</div>
      <div className="noble-strip__items">
        {nobles.map((noble) => {
          const reqs = GEM_COLORS.filter((c) => noble.requirements[c] > 0);
          return (
            <button
              key={noble.id}
              type="button"
              onClick={() => onSelectNoble?.(noble.id)}
              className={`noble-tile ${highlightReserveNoble ? 'noble-tile--selectable' : ''}`}
              title={`${noble.name} · ${noble.title}（+${noble.points}分）`}
            >
              <div className="noble-tile__top">
                <span className="noble-tile__pts">{noble.points}</span>
                <span className="noble-tile__name">{noble.name.slice(0, 4)}</span>
              </div>
              <div className="noble-tile__reqs">
                {reqs.map((c) => {
                  const met = bonuses[c] >= noble.requirements[c];
                  return (
                    <span
                      key={c}
                      className={`mini-req mini-req--${c} ${met ? 'mini-req--met' : ''}`}
                    >
                      {noble.requirements[c]}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
