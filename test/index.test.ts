/**
 * @jest-environment jsdom
*/

import { markerPlayer } from "../src";
import type { LatLngExpression } from "leaflet";

test('To have equal points length as input', () => {
  const latlngs: LatLngExpression[] = [
    [45.51, -120.68],
    [37.77, -100.43],
    [34.04, -80.2],
    [37.04, -79.2]
  ];
  const points = latlngs.map((v, i) => {
    return {id: i, latlng: v};
  });
  const animMarker = markerPlayer(points, 10000);
  expect(animMarker._points.length).toBe(4);
});