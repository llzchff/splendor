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
        <div className="noble-strip__label">欧洲名城 ({cities.length})</div>
        <div className="noble-strip__items noble-strip__items--cities">
          {cities.map((city) => {
            const reqs = GEM_COLORS.filter((c) => city.requirement.bonuses[c] > 0);
            return (
              <div key={city.id} className="city-plaque" title={`${city.name} · ${city.subtitle}`}>
                <img src={getCityArt(city)} alt="" className="city-plaque__art" draggable={false} />
                <div className="city-plaque__scrim" />
                <div className="city-plaque__content">
                  <div className="city-plaque__top">
                    <span className="city-plaque__pts">{city.requirement.minPoints}分</span>
                    <span className="city-plaque__name">{city.name}</span>
                  </div>
                  <div className="city-plaque__reqs">
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
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="noble-strip">
      <div className="noble-strip__label">文艺复兴贵族 ({nobles.length})</div>
      <div className="noble-strip__items">
        {nobles.map((noble) => {
          const reqs = GEM_COLORS.filter((c) => noble.requirements[c] > 0);
          return (
            <button
              key={noble.id}
              type="button"
              onClick={() => onSelectNoble?.(noble.id)}
              className={`noble-plaque ${highlightReserveNoble ? 'noble-plaque--selectable' : ''}`}
              title={`${noble.name} · ${noble.title}（+${noble.points}分）`}
            >
              <img src={getNobleArt(noble)} alt="" className="noble-plaque__art" draggable={false} />
              {/* Classic Splendor Left Frosted Requirement Strip */}
              <div className="noble-plaque__strip">
                <span className="noble-plaque__pts">{noble.points}</span>
                <div className="noble-plaque__reqs">
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
              </div>
              <div className="noble-plaque__caption">{noble.name.slice(0, 4)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
