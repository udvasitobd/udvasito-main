/**
 * SCR-D02 "Use my location once": one foreground location fix, matched to the nearest thana/upazila on this device.
 * The coordinates never leave the phone — the app downloads the public place list and does the matching itself —
 * and are never stored or logged (`donor.setup.locationNote`). Any failure (denied, no fix, outside Bangladesh)
 * returns null and the person picks the area by hand.
 */
import { api } from '@convex/_generated/api';
import { distanceKm, insideBangladesh } from '@convex/rules/places';
import { useConvex } from 'convex/react';
import * as Location from 'expo-location';
import { useCallback } from 'react';

import { nearestPlace } from './setupForm';

/** A phone that cannot get a fix in this time is told to choose by hand. */
const LOCATION_TIMEOUT_MS = 20_000;

export type LocatedArea = { divisionId: string; districtId: string; upazilaId: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

export function useLocateArea() {
  const convex = useConvex();
  return useCallback(async (): Promise<LocatedArea | null> => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) return null;
      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        LOCATION_TIMEOUT_MS,
      );
      if (!position) return null;
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!insideBangladesh(point.lat, point.lng)) return null;

      const [upazilas, districts] = await Promise.all([
        convex.query(api.places.list, { level: 'upazila' }),
        convex.query(api.places.list, { level: 'district' }),
      ]);
      const upazila = nearestPlace(point, upazilas, distanceKm);
      const district = districts.find((d) => d._id === upazila?.parentId);
      if (!upazila || !district?.parentId) return null;
      return { divisionId: district.parentId, districtId: district._id, upazilaId: upazila._id };
    } catch {
      return null;
    }
  }, [convex]);
}
