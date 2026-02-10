import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { DailyTask } from '../types';
import { X, Play, Pause, Check, Maximize2, Minimize2, Navigation, Volume2, VolumeX } from 'lucide-react';
import { canLoadMap, recordMapLoad, getUsageStats } from '../services/mapUsageTracker';

interface FocusOverlayProps {
  task: DailyTask;
  onComplete: () => void;
  onCancel: () => void;
}

// Flight routes - origin and destination coordinates [lng, lat]
const FLIGHT_ROUTES = [
  { origin: [-122.4194, 37.7749], destination: [139.6917, 35.6895], name: 'San Francisco → Tokyo' },
  { origin: [-73.9857, 40.7484], destination: [2.3522, 48.8566], name: 'New York → Paris' },
  { origin: [-0.1276, 51.5074], destination: [103.8198, 1.3521], name: 'London → Singapore' },
  { origin: [151.2093, -33.8688], destination: [-118.2437, 34.0522], name: 'Sydney → Los Angeles' },
  { origin: [77.209, 28.6139], destination: [-43.1729, -22.9068], name: 'Delhi → Rio de Janeiro' },
];

// Generate points along a great circle path
function getGreatCirclePoints(start: [number, number], end: [number, number], numPoints: number = 100): [number, number][] {
  const points: [number, number][] = [];

  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const lat1 = toRad(start[1]);
  const lon1 = toRad(start[0]);
  const lat2 = toRad(end[1]);
  const lon2 = toRad(end[0]);

  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
  ));

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    points.push([toDeg(lon), toDeg(lat)]);
  }

  return points;
}

// Calculate bearing between two points
function getBearing(start: [number, number], end: [number, number]): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const lat1 = toRad(start[1]);
  const lat2 = toRad(end[1]);
  const dLon = toRad(end[0] - start[0]);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const FocusOverlay: React.FC<FocusOverlayProps> = ({ task, onComplete, onCancel }) => {
  const FOCUS_TIME = 25 * 60;
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const routePointsRef = useRef<[number, number][]>([]);
  const [currentRoute] = useState(() => FLIGHT_ROUTES[Math.floor(Math.random() * FLIGHT_ROUTES.length)]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [limitReached, setLimitReached] = useState(false);
  const [usageStats, setUsageStats] = useState(() => getUsageStats());

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const whiteNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Audio Context
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // White Noise Generator
  const toggleWhiteNoise = (play: boolean) => {
    if (!audioContextRef.current || isMuted) return;

    if (play) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const bufferSize = audioContextRef.current.sampleRate * 2;
      const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioContextRef.current.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = audioContextRef.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      const gain = audioContextRef.current.createGain();
      gain.gain.value = 0.15;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioContextRef.current.destination);

      noise.start();
      whiteNoiseNodeRef.current = noise;
      gainNodeRef.current = gain;
    } else {
      if (whiteNoiseNodeRef.current) {
        whiteNoiseNodeRef.current.stop();
        whiteNoiseNodeRef.current = null;
      }
    }
  };

  // Ding Sound Generator
  const playDing = () => {
    if (!audioContextRef.current || isMuted) return;
    const ctx = audioContextRef.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  };

  // Watch for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Function to add route layers to map
  const addRouteLayers = (map: mapboxgl.Map, origin: [number, number], destination: [number, number]) => {
    // Add the flight path line
    if (!map.getSource('route')) {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routePointsRef.current
          }
        }
      });
    }

    // Dashed background line
    if (!map.getLayer('route-background')) {
      map.addLayer({
        id: 'route-background',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#94a3b8',
          'line-width': 2,
          'line-dasharray': [2, 4],
          'line-opacity': 0.4
        }
      });
    }

    // Animated progress line (solid)
    if (!map.getSource('route-progress')) {
      map.addSource('route-progress', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [origin]
          }
        }
      });
    }

    if (!map.getLayer('route-progress')) {
      map.addLayer({
        id: 'route-progress',
        type: 'line',
        source: 'route-progress',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 3,
          'line-opacity': 0.9
        }
      });
    }
  };

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Check if we've hit the usage limit
    if (!canLoadMap()) {
      setLimitReached(true);
      return;
    }

    const origin = currentRoute.origin as [number, number];
    const destination = currentRoute.destination as [number, number];

    mapboxgl.accessToken = 'pk.eyJ1Ijoia2ltaXQwIiwiYSI6ImNtbGNwajhwejB5dDIzZXBrdWZ1MjY5NnIifQ.9TEMbjHwmtrgY-e3_gf6wg';

    // Generate great circle path
    routePointsRef.current = getGreatCirclePoints(origin, destination, 200);

    // Calculate center and bounds
    const centerLng = (origin[0] + destination[0]) / 2;
    const centerLat = (origin[1] + destination[1]) / 2;

    // Choose style based on dark mode
    const mapStyle = isDarkMode
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11';

    // Record this map load
    recordMapLoad();
    setUsageStats(getUsageStats());

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [centerLng, centerLat],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      interactive: false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('error', (e) => {
      console.error('Mapbox error:', e);
    });

    map.on('load', () => {
      console.log('Map loaded successfully');
      setMapLoaded(true);

      addRouteLayers(map, origin, destination);

      // Origin marker
      const originEl = document.createElement('div');
      originEl.className = 'origin-marker';
      originEl.innerHTML = `
        <div style="width: 16px; height: 16px; background: #22c55e; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
      `;
      new mapboxgl.Marker({ element: originEl })
        .setLngLat(origin)
        .addTo(map);

      // Destination marker with pulse
      const destEl = document.createElement('div');
      destEl.className = 'dest-marker';
      destEl.innerHTML = `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; inset: 0; background: #22c55e; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.4;"></div>
          <div style="position: absolute; inset: 4px; background: #22c55e; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
        </div>
      `;
      new mapboxgl.Marker({ element: destEl })
        .setLngLat(destination)
        .addTo(map);

      // Plane marker
      const planeEl = document.createElement('div');
      planeEl.className = 'plane-marker';
      planeEl.innerHTML = `
        <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
      `;
      const marker = new mapboxgl.Marker({ element: planeEl, rotationAlignment: 'map' })
        .setLngLat(origin)
        .addTo(map);

      markerRef.current = marker;

      // Fit map to show entire route - zoom in tight
      const bounds = new mapboxgl.LngLatBounds();
      routePointsRef.current.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 320, left: 40, right: 40 },
        maxZoom: 5,
        duration: 0
      });
    });

    // Add CSS for ping animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ping {
        75%, 100% {
          transform: scale(2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      map.remove();
      mapRef.current = null;
      style.remove();
    };
  }, [currentRoute]);

  // Handle dark mode style changes
  useEffect(() => {
    if (!mapRef.current) return;

    const origin = currentRoute.origin as [number, number];
    const destination = currentRoute.destination as [number, number];
    const newStyle = isDarkMode
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11';

    mapRef.current.once('style.load', () => {
      addRouteLayers(mapRef.current!, origin, destination);
    });
    mapRef.current.setStyle(newStyle);
  }, [isDarkMode]);

  // Update plane position based on progress
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || routePointsRef.current.length === 0) return;

    const progress = (FOCUS_TIME - timeLeft) / FOCUS_TIME;
    const pointIndex = Math.min(
      Math.floor(progress * (routePointsRef.current.length - 1)),
      routePointsRef.current.length - 1
    );

    const currentPoint = routePointsRef.current[pointIndex];
    const nextPoint = routePointsRef.current[Math.min(pointIndex + 1, routePointsRef.current.length - 1)];

    // Update plane position
    markerRef.current.setLngLat(currentPoint);

    // Update plane rotation to face direction of travel
    const bearing = getBearing(currentPoint, nextPoint);
    markerRef.current.setRotation(bearing - 90); // Adjust for plane icon orientation

    // Update progress line
    const map = mapRef.current;
    const progressSource = map.getSource('route-progress') as mapboxgl.GeoJSONSource;
    if (progressSource) {
      progressSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routePointsRef.current.slice(0, pointIndex + 1)
        }
      });
    }
  }, [timeLeft, FOCUS_TIME]);

  // Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && timeLeft > 0) {
      toggleWhiteNoise(true);
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else {
      toggleWhiteNoise(false);
      if (timeLeft === 0 && isActive) {
        setIsActive(false);
        playDing();
      }
    }
    return () => {
      if (interval) clearInterval(interval);
      toggleWhiteNoise(false);
    };
  }, [isActive, timeLeft, isMuted]);

  // Handle Mute Toggle
  useEffect(() => {
    if (isMuted) {
      toggleWhiteNoise(false);
    } else if (isActive) {
      toggleWhiteNoise(true);
    }
  }, [isMuted]);

  useEffect(() => {
    setIsActive(true);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((FOCUS_TIME - timeLeft) / FOCUS_TIME) * 100;

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isMinimized ? 'pointer-events-none' : ''}`}>

      {/* Map Layer */}
      <div className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMinimized ? 'opacity-0 scale-90 translate-y-20' : 'opacity-100 scale-100'} bg-gray-200 dark:bg-gray-900`}>
        {limitReached ? (
          /* Fallback gradient background when limit reached */
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(34, 197, 94, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)'
            }} />
          </div>
        ) : (
          <>
            <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

            {/* Loading indicator */}
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Loading map...</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Subtle vignette overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.15) 100%)'
        }} />

        {/* Route info badge */}
        <div className="absolute top-6 left-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Flight Path</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{currentRoute.name}</div>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
            Map loads: {usageStats.used}/{usageStats.limit} this month
          </div>
          {limitReached && (
            <div className="mt-1 text-[10px] text-amber-500">
              Map disabled to save API usage
            </div>
          )}
        </div>
      </div>

      {/* Control Interface (iOS Sheet Style) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[110] flex flex-col transition-transform duration-500 cubic-bezier(0.32,0.72,0,1) ${isMinimized ? 'translate-y-[calc(100%-90px)]' : 'translate-y-0'} pointer-events-auto`}
      >
        {/* Handle Bar Area */}
        <div
          className="w-full flex justify-center pb-2 pt-4 cursor-pointer"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="h-1.5 w-12 rounded-full bg-black/20 backdrop-blur-md" />
        </div>

        {/* The Frosted Glass Panel */}
        <div className="mx-4 mb-4 overflow-hidden rounded-[32px] bg-white/85 dark:bg-[#1c1c1e]/85 shadow-2xl backdrop-blur-xl border border-white/50 dark:border-white/10">

          {/* Task Info Header */}
          <div className="flex items-center justify-center gap-3 px-6 pt-5 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-600">
              <Navigation size={18} fill="currentColor" className="opacity-80" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <div className="text-[11px] font-bold uppercase tracking-wider text-green-600">Focus Mode</div>
              </div>
              <div className="text-base font-medium text-gray-900 dark:text-white max-w-[240px] truncate leading-tight">{task.text}</div>
            </div>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="rounded-full bg-gray-100 dark:bg-white/10 p-2 text-gray-600 dark:text-white transition-colors hover:bg-gray-200 dark:hover:bg-white/20"
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
          </div>

          {/* Centered Timer */}
          <div className="flex justify-center py-4">
            <div className="text-6xl font-light tracking-tight text-gray-900 dark:text-white tabular-nums">
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Centered Controls */}
          <div className="flex items-center justify-center gap-6 px-6 pb-6 pt-2">
            {/* Cancel Button */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white transition-all hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-500 active:scale-95 z-20 relative"
            >
              <X size={24} />
            </button>

            {/* Play/Pause (Main) */}
            <button
              onClick={() => setIsActive(!isActive)}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 transition-all hover:scale-105 active:scale-95 active:bg-green-600 z-20 relative"
            >
              {isActive ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
            </button>

            {/* Complete */}
            <button
              onClick={onComplete}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white transition-all hover:bg-green-100 dark:hover:bg-green-500/20 hover:text-green-600 dark:hover:text-green-500 active:scale-95 z-20 relative"
            >
              <Check size={24} />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors z-20 relative"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FocusOverlay;
