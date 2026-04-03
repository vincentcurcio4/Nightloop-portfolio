import { useCallback, useMemo, useState } from 'react';
import { getMyActiveCheckin, type ActiveCheckin } from '../lib/checkins';
import {
  getCurrentDeviceCoords,
  requestForegroundLocationPermission,
  type DeviceCoords,
} from '../lib/location';
import {
  hydrateNearbyCache,
  readNearbyCache,
  shouldReuseNearbyCache,
  writeNearbyCache,
} from '../lib/nearbyCache';
import {
  fetchNearbyVenues,
  hasNearbyDistance,
  isDemoVenueModeEnabled,
  isMockNearbySource,
  type NearbyVenue,
} from '../lib/nearbyVenues';
import {
  attachDistanceToNearbyVenues,
  loadFallbackNearbyVenues,
  type VenueFeedSource,
} from '../lib/venueDiscovery';

const DEMO_VENUES_ENABLED = isDemoVenueModeEnabled();
const FORCE_REFRESH_CACHE_MAX_AGE_MS = 45 * 1000;
const FORCE_REFRESH_MIN_MOVEMENT_METERS = 100;

type LocationStatus = 'idle' | 'granted' | 'denied' | 'error';

export function useVenueDiscovery(userId: string | null) {
  const [displayVenues, setDisplayVenues] = useState<NearbyVenue[]>([]);
  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin | null>(null);
  const [nearbySource, setNearbySource] = useState<VenueFeedSource>('unknown');
  const [didNearbyRequestFail, setDidNearbyRequestFail] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [deviceCoords, setDeviceCoords] = useState<DeviceCoords | null>(null);
  const [fetching, setFetching] = useState(true);
  const [refreshingNearby, setRefreshingNearby] = useState(false);

  const loadNearby = useCallback(async (forceRefresh = false) => {
    setDidNearbyRequestFail(false);

    await hydrateNearbyCache();

    const granted = await requestForegroundLocationPermission();

    if (!granted) {
      setDeviceCoords(null);
      setLocationStatus('denied');
      const fallback = await loadFallbackNearbyVenues(null);
      setDisplayVenues(fallback);
      setNearbySource('fallback');
      return;
    }

    setLocationStatus('granted');

    const coords = await getCurrentDeviceCoords();
    setDeviceCoords(coords);

    const cached = readNearbyCache();
    const shouldUseCachedNearby =
      shouldReuseNearbyCache(coords) ||
      (forceRefresh &&
        shouldReuseNearbyCache(
          coords,
          FORCE_REFRESH_CACHE_MAX_AGE_MS,
          FORCE_REFRESH_MIN_MOVEMENT_METERS
        ));

    if (
      shouldUseCachedNearby &&
      cached &&
      (DEMO_VENUES_ENABLED || !isMockNearbySource(cached.source))
    ) {
      setDisplayVenues(attachDistanceToNearbyVenues(cached.venues, coords));
      setNearbySource('cache');
      return;
    }

    try {
      const result = await fetchNearbyVenues(coords.latitude, coords.longitude);

      if (isMockNearbySource(result.source) && !DEMO_VENUES_ENABLED) {
        const fallback = await loadFallbackNearbyVenues(coords);
        setDisplayVenues(fallback);
        setNearbySource('fallback');
        return;
      }

      await writeNearbyCache(coords, result.source, result.venues);
      setDisplayVenues(attachDistanceToNearbyVenues(result.venues, coords));
      setNearbySource(result.source);
    } catch (error) {
      console.warn('[venues] nearby function unavailable, using saved venues', error);
      setLocationStatus('error');
      setDidNearbyRequestFail(true);
      const fallback = await loadFallbackNearbyVenues(coords);
      setDisplayVenues(fallback);
      setNearbySource('fallback');
    }
  }, []);

  const refreshAll = useCallback(
    async (forceNearbyRefresh = false) => {
      if (!userId) return;

      try {
        setFetching(true);

        const [activeResult] = await Promise.all([
          getMyActiveCheckin(userId),
          loadNearby(forceNearbyRefresh),
        ]);

        setActiveCheckin(activeResult);
      } catch (error) {
        setLocationStatus('error');
        setDidNearbyRequestFail(false);

        try {
          const fallback = await loadFallbackNearbyVenues(null);
          setDisplayVenues(fallback);
          setNearbySource('fallback');
        } catch {
          // Keep the original error when even fallback loading fails.
        }

        throw error;
      } finally {
        setFetching(false);
      }
    },
    [loadNearby, userId]
  );

  const refreshNearby = useCallback(async () => {
    try {
      setRefreshingNearby(true);
      await loadNearby(true);
    } finally {
      setRefreshingNearby(false);
    }
  }, [loadNearby]);

  const nearestVenue = useMemo(() => {
    return displayVenues.find((venue) => hasNearbyDistance(venue)) ?? null;
  }, [displayVenues]);

  return {
    activeCheckin,
    deviceCoords,
    didNearbyRequestFail,
    displayVenues,
    fetching,
    locationStatus,
    nearbySource,
    nearestVenue,
    refreshingNearby,
    refreshAll,
    refreshNearby,
    setActiveCheckin,
  };
}
