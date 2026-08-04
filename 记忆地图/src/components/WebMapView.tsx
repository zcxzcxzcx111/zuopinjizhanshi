import React, { Component, ErrorInfo, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SceneMarker } from '../types';
import { wgs84ToGcj02 } from '../utils/coordTransform';
import Supercluster from 'supercluster';
import { loadPhotoAssets, peekPhotoAssets } from '../services/photoAssetStorage';

interface WebMapViewProps {
  markers: SceneMarker[];
  selectedIndex: number;
  onMarkerPress: (index: number) => void;
}

export default function WebMapView({ markers, selectedIndex, onMarkerPress }: WebMapViewProps) {
  return (
    <MapErrorBoundary>
      <DirectLeafletMap
        markers={markers}
        selectedIndex={selectedIndex}
        onMarkerPress={onMarkerPress}
      />
    </MapErrorBoundary>
  );
}

class MapErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WebMapView] rendering failed', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackTitle}>地图暂时无法显示</Text>
          <Text style={styles.mapFallbackText}>照片已保存，可刷新页面重试地图。</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ==================== Web: Direct Leaflet ====================

function DirectLeafletMap({
  markers,
  selectedIndex,
  onMarkerPress,
}: WebMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const superclusterRef = useRef<Supercluster<any, any> | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [leafletLoadError, setLeafletLoadError] = useState(false);

  // Load Leaflet CSS + JS once
  useEffect(() => {
    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = '/vendor/leaflet/leaflet.css';
      link.onerror = () => setLeafletLoadError(true);
      document.head.appendChild(link);
    }

    // JS
    if ((window as any).L) {
      setLeafletReady(true);
      return;
    }

    const existing = document.querySelector('script[src*="leaflet"]');
    if (existing) {
      existing.addEventListener('load', () => setLeafletReady(true));
      existing.addEventListener('error', () => setLeafletLoadError(true));
      return;
    }

    const script = document.createElement('script');
    script.src = '/vendor/leaflet/leaflet.js';
    script.onload = () => setLeafletReady(true);
    script.onerror = () => setLeafletLoadError(true);
    document.body.appendChild(script);
  }, []);

  // Initialize map (runs once after Leaflet is loaded)
  useEffect(() => {
    if (!leafletReady) return;
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Avoid creating duplicate map
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
    }).addTo(map);

    // Leaflet requires an initial view before flyTo/flyToBounds can run.
    // The marker effect below will move from this fallback to the saved place.
    map.setView([31.0, 121.0], 8);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Fix 0x0 size on mount issue when switching tabs
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletReady]);

  // Compute marker size based on current zoom level
  const getMarkerSize = (zoom: number, hasCharacter: boolean, isSelected: boolean) => {
    const scale = Math.min(1.2, Math.max(0.6, (zoom - 4) / 11));
    const base = hasCharacter ? 104 : (isSelected ? 72 : 56);
    return Math.round(base * scale);
  };

  // Track expanded stacks
  const expandedStackRef = useRef<string | null>(null);

  // Render all markers using the pre-loaded assetsMap
  const renderMarkers = useCallback(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current || !markersLayerRef.current || !superclusterRef.current) return;

    markersLayerRef.current.clearLayers();
    const map = mapInstanceRef.current;
    
    let bounds;
    try { bounds = map.getBounds(); } catch(e) { return; }
    
    const zoom = map.getZoom();
    
    // Calculate bounding box for supercluster: [westLng, southLat, eastLng, northLat]
    const bbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];

    const clusters = superclusterRef.current.getClusters(bbox as any, Math.round(zoom));

    clusters.forEach((cluster: any) => {
      const [lng, lat] = cluster.geometry.coordinates;
      const isCluster = cluster.properties.cluster;
      
      const stackKey = `${lat.toFixed(5)}-${lng.toFixed(5)}`;
      const isExpanded = expandedStackRef.current === stackKey;
      
      let group: any[] = [];
      if (isCluster) {
        const leaves = superclusterRef.current!.getLeaves(cluster.properties.cluster_id, Infinity);
        group = leaves.map(l => ({ ...l.properties, gcjLat: l.geometry.coordinates[1], gcjLng: l.geometry.coordinates[0] }));
      } else {
        group = [{ ...cluster.properties, gcjLat: lat, gcjLng: lng }];
      }

      const anchor = group[0];
      const isStack = group.length > 1;

      if (isStack && !isExpanded) {
        // Render stacked marker with count badge
        const topPhoto = group.find((g: any) => g.photo.hasCharacterUri) || group[0];
        const underlyingItems = group.filter((g: any) => g !== topPhoto).slice(0, 2);

        const hasChar = !!topPhoto.photo.hasCharacterUri;
        const sz = getMarkerSize(zoom, hasChar, false);

        // Simple seeded random function
        const seededRandom = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

        let stackItemsHTML = '';

        // Render underlying items first (placeholders; images set after)
        underlyingItems.forEach((uItem: any, index: number) => {
          const seed = uItem.gcjLat * 1000 + uItem.gcjLng * 100 + index;
          const angle = seededRandom(seed) * 360;
          const offsetX = (seededRandom(seed + 1) * 6) - 3;
          const offsetY = (seededRandom(seed + 2) * 6) - 3;
          const uHasChar = !!uItem.photo.hasCharacterUri;
          const uSz = getMarkerSize(zoom, uHasChar, false);
          const topOffset = (sz - uSz) / 2 + offsetY;
          const leftOffset = (sz - uSz) / 2 + offsetX;
          if (uHasChar) {
            stackItemsHTML += `<div style="position:absolute;top:${topOffset}px;left:${leftOffset}px;width:${uSz}px;height:${uSz}px;transform:rotate(${angle}deg);z-index:${index + 1};opacity:0.85;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15)) brightness(0.85);"><img data-pid="${uItem.photo.id}" data-kind="char" style="width:100%;height:100%;object-fit:contain;" /></div>`;
          } else {
            stackItemsHTML += `<div style="position:absolute;top:${topOffset}px;left:${leftOffset}px;width:${uSz}px;height:${uSz}px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.8);box-shadow:0 2px 4px rgba(0,0,0,0.15);transform:rotate(${angle}deg);z-index:${index + 1};opacity:0.85;filter:brightness(0.85);"><img data-pid="${uItem.photo.id}" data-kind="photo" style="width:100%;height:100%;object-fit:cover;" /></div>`;
          }
        });

        // Render top item
        if (hasChar) {
          stackItemsHTML += `<div style="position:relative;width:${sz}px;height:${sz}px;z-index:10;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.25));"><img data-pid="${topPhoto.photo.id}" data-kind="char" style="width:100%;height:100%;object-fit:contain;" /><div style="position:absolute;top:-4px;right:-4px;width:22px;height:22px;border-radius:11px;background:#FF6B6B;border:2px solid #FFF;display:flex;align-items:center;justify-content:center;z-index:20;"><span style="color:#FFF;font-size:11px;font-weight:700;font-family:-apple-system,sans-serif;">${group.length}</span></div></div>`;
        } else {
          stackItemsHTML += `<div style="position:relative;width:${sz}px;height:${sz}px;border-radius:50%;overflow:visible;z-index:10;"><div style="width:100%;height:100%;border-radius:50%;overflow:hidden;border:3px solid #FFF;box-shadow:0 3px 6px rgba(0,0,0,0.2);"><img data-pid="${topPhoto.photo.id}" data-kind="photo" style="width:100%;height:100%;object-fit:cover;" /></div><div style="position:absolute;top:-4px;right:-4px;width:22px;height:22px;border-radius:11px;background:#FF6B6B;border:2px solid #FFF;display:flex;align-items:center;justify-content:center;z-index:20;"><span style="color:#FFF;font-size:11px;font-weight:700;font-family:-apple-system,sans-serif;">${group.length}</span></div></div>`;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'marker-inner';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.cursor = 'pointer';
        wrapper.innerHTML = `<div style="position:relative;width:${sz}px;height:${sz};">${stackItemsHTML}</div>`;

        // Resolve images asynchronously for rendered markers only
        wrapper.querySelectorAll('img[data-pid]').forEach((imgEl: Element) => {
          const img = imgEl as HTMLImageElement;
          const pid = img.getAttribute('data-pid') || '';
          const kind = img.getAttribute('data-kind');
          
          const cached = peekPhotoAssets(pid);
          if (cached) {
            img.src = (kind === 'char' ? cached.characterUri : cached.uri) || '';
          } else {
            loadPhotoAssets(pid).then((a) => {
              if (a) img.src = (kind === 'char' ? a.characterUri : a.uri) || '';
            });
          }
        });

        const iconSz = sz + 12;
        const icon = L.divIcon({
          className: 'marker-wrapper stack-marker',
          html: wrapper,
          iconSize: [iconSz, iconSz + 8],
          iconAnchor: [iconSz / 2, iconSz + 8],
        });

        L.marker([anchor.gcjLat, anchor.gcjLng], { icon })
          .addTo(markersLayerRef.current)
          .on('click', () => {
            expandedStackRef.current = stackKey;
            renderMarkers();
          });
      } else {
        // Render individual markers (single or expanded stack)
        const itemsToRender = isExpanded ? group : [group[0]];

        itemsToRender.forEach((item, expandIdx) => {
          const { photo, marker, gcjLat, gcjLng, markerIdx } = item;
          const isSelected = markerIdx === selectedIndex;
          const sz = getMarkerSize(zoom, !!photo.hasCharacterUri, isSelected);

          // For expanded stacks, fan items out in a circle
          let renderLat = gcjLat;
          let renderLng = gcjLng;
          if (isExpanded && itemsToRender.length > 1) {
            const angle = (expandIdx / itemsToRender.length) * Math.PI * 2 - Math.PI / 2;
            const spreadPx = Math.max(sz * 1.2, 60);
            const centerPt = map.latLngToContainerPoint([gcjLat, gcjLng]);
            const offsetPt = L.point(
              centerPt.x + Math.cos(angle) * spreadPx,
              centerPt.y + Math.sin(angle) * spreadPx
            );
            const offsetLatLng = map.containerPointToLatLng(offsetPt);
            renderLat = offsetLatLng.lat;
            renderLng = offsetLatLng.lng;
          }

          const hasChar = !!photo.hasCharacterUri;
          let markerHTML: string;

          if (hasChar) {
            markerHTML = `<div style="width:${sz}px;height:${sz}px;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.2));transition:all 0.3s ease;"><img data-pid="${photo.id}" data-kind="char" style="width:100%;height:100%;object-fit:contain;" /></div>`;
          } else {
            markerHTML = `<div style="width:${sz}px;height:${sz}px;border-radius:50%;overflow:hidden;border:3px solid #FFF;box-shadow:0 3px 6px rgba(0,0,0,0.2);transition:all 0.3s ease;"><img data-pid="${photo.id}" data-kind="photo" style="width:100%;height:100%;object-fit:cover;" /></div>`;
          }

          let bubbleHTML = '';
          if (isSelected && !isExpanded) {
            const placeName = marker.location.placeName || '';
            const desc = marker.description || '';
            const showDesc = desc && desc !== placeName;

            bubbleHTML = `<div style="width:8px;height:8px;background:#4ECDC4;border-radius:50%;margin:0 auto 4px;box-shadow:0 0 6px rgba(78,205,196,0.6);"></div>
              <div style="background:white;border-radius:12px;padding:6px 10px;box-shadow:0 2px 6px rgba(0,0,0,0.15);text-align:center;max-width:130px;margin-bottom:4px;font-family:-apple-system,sans-serif;">
              ${placeName ? `<div style="font-size:11px;color:#4ECDC4;font-weight:400;">${escapeHtml(placeName)}</div>` : ''}
              <div style="font-size:11px;color:#666;margin-top:2px;">${formatDate(marker.date)}</div>
              ${showDesc ? `<div style="font-size:12px;color:#333;font-weight:600;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(desc)}</div>` : ''}
              </div>`;
          }

          // Place name label for expanded items
          let labelHTML = '';
          if (isExpanded && itemsToRender.length > 1) {
            const placeName = photo.description || marker.location.placeName || '';
            if (placeName) {
              labelHTML = `<div style="background:white;border-radius:8px;padding:2px 6px;margin-top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.1);font-family:-apple-system,sans-serif;font-size:10px;color:#333;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${escapeHtml(placeName)}</div>`;
            }
          }

          const wrapper = document.createElement('div');
          wrapper.className = 'marker-inner';
          wrapper.style.display = 'flex';
          wrapper.style.flexDirection = 'column';
          wrapper.style.alignItems = 'center';
          wrapper.style.cursor = 'pointer';
          wrapper.innerHTML = `${bubbleHTML}${markerHTML}${labelHTML}`;

          // Resolve single marker image asynchronously
          wrapper.querySelectorAll('img[data-pid]').forEach((imgEl: Element) => {
            const img = imgEl as HTMLImageElement;
            const pid = img.getAttribute('data-pid') || '';
            const kind = img.getAttribute('data-kind');
            
            const cached = peekPhotoAssets(pid);
            if (cached) {
              img.src = (kind === 'char' ? cached.characterUri : cached.uri) || '';
            } else {
              loadPhotoAssets(pid).then((a) => {
                if (a) img.src = (kind === 'char' ? a.characterUri : a.uri) || '';
              });
            }
          });

          const iconWidth = sz + 20;
          const iconHeight = (isSelected && !isExpanded) ? sz + 80 : sz + 20;
          const icon = L.divIcon({
            className: `marker-wrapper ${isSelected ? 'selected' : ''}`,
            html: wrapper,
            iconSize: [iconWidth, iconHeight],
            iconAnchor: [iconWidth / 2, iconHeight],
          });

          L.marker([renderLat, renderLng], { icon })
            .addTo(markersLayerRef.current)
            .on('click', () => {
              if (isExpanded) {
                // Clicking an expanded item: close stack and select that marker
                expandedStackRef.current = null;
                onMarkerPress(markerIdx);
              } else {
                onMarkerPress(markerIdx);
              }
            });
        });

        // If expanded, add a "close" circle at center
        if (isExpanded && group.length > 1) {
          const closeSz = 28;
          const closeIcon = L.divIcon({
          className: 'marker-wrapper close-stack-marker',
          html: `<div class="marker-inner" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:16px;background:#FFF;box-shadow:0 3px 8px rgba(0,0,0,0.3);cursor:pointer;border:1px solid #EEE;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          });
          L.marker([anchor.gcjLat, anchor.gcjLng], { icon: closeIcon })
            .addTo(markersLayerRef.current)
            .on('click', () => {
              expandedStackRef.current = null;
              renderMarkers();
            });
        }
      }
    });
  }, [markers, selectedIndex, onMarkerPress]);

  // Update markers and Supercluster when data changes
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    // Build Supercluster index
    const flatItems: any[] = [];
    markers.forEach((m, mi) => {
      if (!Number.isFinite(m.location.latitude) || !Number.isFinite(m.location.longitude)) return;
      m.photos.forEach((photo, pi) => {
        const [gcjLat, gcjLng] = wgs84ToGcj02(
          photo.location?.latitude ?? m.location.latitude,
          photo.location?.longitude ?? m.location.longitude
        );
        flatItems.push({
          type: 'Feature',
          properties: { markerIdx: mi, photoIdx: pi, photo, marker: m },
          geometry: { type: 'Point', coordinates: [gcjLng, gcjLat] }
        });
      });
    });

    const index = new Supercluster({ radius: 50, maxZoom: 16 });
    index.load(flatItems);
    superclusterRef.current = index;

    // Directly render markers; images will load asynchronously when rendered
    renderMarkers();

    // Fly to relevant area
    const bounds = L.latLngBounds([]);
    markers.forEach((m) => {
      if (!Number.isFinite(m.location.latitude) || !Number.isFinite(m.location.longitude)) return;
      const [gcjLat, gcjLng] = wgs84ToGcj02(m.location.latitude, m.location.longitude);
      bounds.extend([gcjLat, gcjLng]);
    });

    if (markers.length > 0) {
      if (selectedIndex >= 0 && markers[selectedIndex]) {
        const [selLat, selLng] = wgs84ToGcj02(markers[selectedIndex].location.latitude, markers[selectedIndex].location.longitude);
        let currentZoom = 15;
        try { currentZoom = mapInstanceRef.current.getZoom(); } catch (e) {}
        mapInstanceRef.current.flyTo([selLat, selLng], Math.max(currentZoom, 15), { animate: true, duration: 1.0 });
      } else if (markers.length === 1 || bounds.getSouthWest().equals(bounds.getNorthEast())) {
        const center = bounds.getCenter();
        mapInstanceRef.current.flyTo([center.lat, center.lng], 15, { animate: true, duration: 1.0 });
      } else {
        mapInstanceRef.current.flyToBounds(bounds.pad(0.3), { animate: true, duration: 1.0 });
      }
    } else {
      mapInstanceRef.current.setView([31.0, 121.0], 8);
    }
  }, [markers, selectedIndex, onMarkerPress, renderMarkers]);

  // Re-render markers on zoom/move change for dynamic sizing and supercluster bounding box
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapChange = () => {
      expandedStackRef.current = null; // collapse stacks on zoom/move
      renderMarkers();
    };
    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange); // Important for supercluster to re-query new bounds
    return () => { 
      map.off('zoomend', handleMapChange); 
      map.off('moveend', handleMapChange); 
    };
  }, [renderMarkers]);

  if (leafletLoadError) {
    return (
      <View style={styles.mapFallback}>
        <Text style={styles.mapFallbackTitle}>地图资源加载失败</Text>
        <Text style={styles.mapFallbackText}>请检查网络后刷新页面重试。</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <style>{`
        .marker-wrapper {
          transition: z-index 0.2s ease-out;
        }
        .marker-wrapper:hover {
          z-index: 1000 !important;
        }
        .marker-wrapper.selected {
          z-index: 999 !important;
        }
        .marker-inner {
          transform-origin: bottom center;
          transition: transform 0.2s ease-out;
        }
        .marker-wrapper:hover .marker-inner {
          transform: translateY(-4px);
        }
        .stack-marker:hover .marker-inner {
          filter: brightness(1.05);
        }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
      <div ref={mapRef} style={{ width: '100%', height: '100%', flex: 1 }} />
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>{markers.length} 个地点</Text>
        <Text style={styles.infoText}>
          双指缩放 / 拖拽查看
        </Text>
      </View>
    </View>
  );
}

// ==================== Helpers ====================

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function escapeHtml(str: string) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function buildMapHTML(
  markers: SceneMarker[],
  selectedIndex: number
): string {
  const markersJSON = JSON.stringify(
    markers.map((m, i) => {
      const [gcjLat, gcjLng] = wgs84ToGcj02(m.location.latitude, m.location.longitude);
      const generatedCharacter = m.photos.find((photo) => photo.characterUri)?.characterUri;
      return {
        lat: gcjLat, lng: gcjLng, tag: m.tag,
        description: m.description, date: m.date,
        photoUri: m.photos[0]?.uri || '',
        characterUri: generatedCharacter || null,
        placeName: m.location.placeName || '',
        index: i, isSelected: i === selectedIndex,
      };
    })
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
  <script src="/vendor/leaflet/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .marker-wrapper { 
      cursor: pointer; 
      transform: none !important;
      transform-origin: bottom center;
      transition: transform 0.2s ease-out;
    }
    .marker-wrapper:hover { 
      transform: none !important;
      z-index: 1000 !important;
    }
    .marker-wrapper.selected {
      z-index: 999 !important;
    }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var markersData = ${markersJSON};
    var map = L.map('map', { zoomControl: true, attributionControl: false });
    
    L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', { subdomains: ['1','2','3','4'], maxZoom: 18 }).addTo(map);
    if (markersData.length > 0) {
      var b = L.latLngBounds(markersData.map(function(m){return[m.lat,m.lng]}));
      var selIdx = markersData.findIndex(function(m){return m.isSelected;});
      if (selIdx >= 0) {
        map.flyTo([markersData[selIdx].lat, markersData[selIdx].lng], Math.max(map.getZoom(), 15), { animate: true, duration: 1.0 });
      } else if (markersData.length === 1 || b.getSouthWest().equals(b.getNorthEast())) {
        var c = b.getCenter();
        map.flyTo([c.lat, c.lng], 15, { animate: true, duration: 1.0 });
      } else {
        map.flyToBounds(b.pad(0.3), { animate: true, duration: 1.0 });
      }
    } else { map.setView([31.0,121.0],8); }
    markersData.forEach(function(m) {
      var sel = m.isSelected, sz = sel?60:48, mh;
      if (m.characterUri) {
         sz = 82;
         mh='<div style="width:'+sz+'px;height:'+sz+'px;filter:drop-shadow(0px 4px 8px rgba(0,0,0,0.15)) drop-shadow(0px 0px 1px rgba(0,0,0,0.1));"><img src="'+m.characterUri+'" style="width:100%;height:100%;object-fit:contain;"/></div>';
      } else {
         mh='<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;overflow:hidden;border:3px solid #FFF;box-shadow:0 3px 6px rgba(0,0,0,0.2);"><img src="'+m.photoUri+'" style="width:100%;height:100%;object-fit:cover;"/></div>';
      }
      var bh=''; if(sel){ bh='<div style="width:8px;height:8px;background:#4ECDC4;border-radius:50%;margin:0 auto 4px;box-shadow:0 0 6px rgba(78,205,196,0.6);"></div><div style="background:white;border-radius:12px;padding:6px 10px;box-shadow:0 2px 6px rgba(0,0,0,0.15);text-align:center;max-width:130px;margin-bottom:4px;font-family:-apple-system,sans-serif;">'+(m.placeName?'<div style="font-size:11px;color:#4ECDC4;font-weight:400;">'+m.placeName+'</div>':'')+'<div style="font-size:11px;color:#666;margin-top:2px;">'+(new Date(m.date).getMonth()+1)+'/'+new Date(m.date).getDate()+'</div><div style="font-size:12px;color:#333;font-weight:600;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+m.description+'</div></div>'; }
      var icon = L.divIcon({ className:'marker-wrapper'+(sel?' selected':''), html:'<div style="display:flex;flex-direction:column;align-items:center;animation:float 3s ease-in-out infinite;'+(sel?'':'animation-delay:'+m.index*0.2+'s;')+'">'+bh+mh+'</div>', iconSize:[70,sel?120:70], iconAnchor:[35,sel?120:70] });
      L.marker([m.lat,m.lng],{icon:icon}).addTo(map).on('click',function(){ if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerPress',index:m.index}));} });
    });
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6F8',
    padding: 24,
  },
  mapFallbackTitle: { fontSize: 18, fontWeight: '600', color: '#1C2026', marginBottom: 8 },
  mapFallbackText: { fontSize: 14, color: '#69707A' },
  container: { flex: 1, minHeight: 500 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 8, marginTop: 8,
  },
  infoText: { fontSize: 12, color: '#999' },
});
