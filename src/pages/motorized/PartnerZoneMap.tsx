import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Layer } from 'leaflet';
import type { PartnerZonePoint } from '../../services/deliveryPartnerClient';

const CENTER = { lat: -12.046373, lng: -77.042755 };

export function PartnerZoneMap({
  points,
  color = '#8746ff',
  onChange,
}: {
  points: PartnerZonePoint[];
  color?: string;
  onChange: (points: PartnerZonePoint[]) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const drawnRef = useRef<Layer[]>([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mapRef.current) return;
    let alive = true;
    void import('leaflet').then(({ default: L }) => {
      if (!alive || !hostRef.current || mapRef.current) return;
      const map = L.map(hostRef.current).setView([CENTER.lat, CENTER.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      map.on('click', (event) => {
        onChangeRef.current([
          ...((hostRef.current?.dataset.points ? JSON.parse(hostRef.current.dataset.points) : []) as PartnerZonePoint[]),
          { id: `pt_${Date.now()}`, latitude: event.latlng.lat, longitude: event.latlng.lng },
        ]);
      });
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      alive = false;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (host) host.dataset.points = JSON.stringify(points);
    const map = mapRef.current;
    if (!map) return;
    void import('leaflet').then(({ default: L }) => {
      drawnRef.current.forEach((layer) => map.removeLayer(layer));
      drawnRef.current = [];
      points.forEach((point) => {
        drawnRef.current.push(L.circleMarker([point.latitude, point.longitude], { radius: 6, color, weight: 2 }).addTo(map));
      });
      if (points.length >= 2) {
        drawnRef.current.push(L.polygon(points.map((point) => [point.latitude, point.longitude]), { color, weight: 2, fillOpacity: 0.15 }).addTo(map));
      }
      if (points.length) map.fitBounds(points.map((point) => [point.latitude, point.longitude]), { padding: [16, 16] });
    });
  }, [points, color, ready]);

  return <div ref={hostRef} className="partner-map" />;
}
