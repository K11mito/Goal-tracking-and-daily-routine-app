import React, { useState, useEffect, useRef } from 'react';
import { DailyTask } from '../types';
import { Plane, X, Play, Pause, Check, Maximize2, Minimize2, Navigation, Volume2, VolumeX } from 'lucide-react';

interface FocusOverlayProps {
  task: DailyTask;
  onComplete: () => void;
  onCancel: () => void;
}

const FocusOverlay: React.FC<FocusOverlayProps> = ({ task, onComplete, onCancel }) => {
  // 25 minutes default
  const FOCUS_TIME = 25 * 60; 
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const whiteNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Audio Context
  useEffect(() => {
    // Only init audio context on user interaction if possible, but here we do it on mount to be ready
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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
      
      // Create buffer
      const bufferSize = audioContextRef.current.sampleRate * 2; // 2 seconds
      const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      // Create source
      const noise = audioContextRef.current.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Create filter to make it "Brown/Pink" noise (softer)
      const filter = audioContextRef.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      // Create gain
      const gain = audioContextRef.current.createGain();
      gain.gain.value = 0.15; // Volume

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
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  };

  // Timer Effect
  useEffect(() => {
    let interval: any = null;
    
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
      } else if (timeLeft === 0) {
        // Just finished
      }
    }
    return () => {
      clearInterval(interval);
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

  const progress = (FOCUS_TIME - timeLeft) / FOCUS_TIME;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Map Logic
  const startPos = { x: 28, y: 16 }; 
  const endPos = { x: 49, y: 13 };
  const controlPos = { x: 38, y: 2 };

  const getPlanePos = (t: number) => {
    const x = (1 - t) * (1 - t) * startPos.x + 2 * (1 - t) * t * controlPos.x + t * t * endPos.x;
    const y = (1 - t) * (1 - t) * startPos.y + 2 * (1 - t) * t * controlPos.y + t * t * endPos.y;
    return { x, y };
  };

  const getRotation = (t: number) => {
    const dx = 2 * (1 - t) * (controlPos.x - startPos.x) + 2 * t * (endPos.x - controlPos.x);
    const dy = 2 * (1 - t) * (controlPos.y - startPos.y) + 2 * t * (endPos.y - controlPos.y);
    return Math.atan2(dy, dx) * (180 / Math.PI) + 45;
  };

  const currentPos = getPlanePos(progress);
  const rotation = getRotation(progress);

  // SVG World Map Path - High Fidelity
  const worldMapPath = "M28.3,16.4 L28.3,16.4 L26.2,14.6 L24.6,14.0 L22.9,14.4 L21.7,13.2 L22.1,11.8 L20.7,11.6 L20.1,10.2 L18.0,10.0 L16.4,11.6 L14.7,11.4 L13.5,12.2 L12.5,11.2 L12.5,9.2 L14.5,7.6 L16.6,7.6 L19.4,4.2 L22.7,4.0 L24.6,5.2 L25.4,4.0 L33.1,2.8 L36.2,3.8 L38.6,3.0 L40.2,4.8 L42.3,4.0 L44.7,4.8 L47.1,3.8 L50.2,5.2 L52.6,4.0 L54.0,5.2 L55.5,5.2 L56.9,6.6 L56.9,8.4 L55.9,10.2 L54.7,10.2 L53.3,11.2 L53.3,12.8 L50.4,13.6 L49.0,13.0 L47.8,13.8 L48.0,15.2 L46.6,16.0 L45.9,15.2 L45.1,16.0 L44.7,17.4 L43.0,17.4 L41.8,18.4 L42.3,19.8 L44.7,19.4 L45.6,20.6 L45.6,21.8 L47.3,22.2 L48.3,23.6 L47.3,25.0 L46.4,26.4 L47.8,28.2 L50.0,29.0 L50.0,30.6 L48.5,31.4 L48.5,32.8 L47.1,33.6 L47.1,35.6 L48.5,36.4 L49.0,38.2 L50.7,39.0 L51.9,38.2 L53.1,39.6 L54.5,39.0 L55.9,39.6 L56.4,38.2 L57.9,37.6 L59.1,38.2 L60.3,37.6 L61.0,36.4 L62.7,36.4 L63.6,35.0 L65.3,35.0 L66.5,34.2 L67.9,35.0 L69.4,34.2 L70.6,35.0 L72.0,34.2 L72.0,32.8 L70.6,31.4 L71.5,30.0 L72.5,30.6 L74.2,29.8 L75.4,30.6 L76.8,29.8 L77.5,28.2 L79.2,28.2 L80.4,27.4 L81.8,28.2 L83.0,27.4 L84.5,27.4 L85.9,26.4 L86.6,27.4 L86.6,29.0 L85.2,30.6 L86.6,32.2 L85.9,33.6 L85.2,32.8 L83.7,33.6 L83.7,35.0 L84.5,36.4 L83.0,36.4 L82.3,37.6 L83.7,39.0 L84.5,40.6 L85.9,40.6 L87.3,39.6 L88.8,39.6 L89.5,38.2 L91.2,37.6 L92.6,38.2 L93.3,37.6 L94.8,36.4 L95.5,35.0 L94.0,34.2 L94.0,32.8 L92.6,31.4 L91.9,30.0 L92.6,28.2 L91.2,27.4 L90.4,26.4 L89.0,26.4 L88.3,25.0 L89.0,23.6 L87.5,23.6 L86.6,22.2 L85.2,22.2 L83.7,21.4 L83.7,20.0 L85.2,18.4 L84.5,17.0 L82.3,17.0 L81.6,15.2 L83.0,14.4 L83.0,13.0 L81.6,11.6 L80.1,12.2 L79.2,11.6 L78.4,13.0 L77.0,13.0 L75.6,12.2 L74.2,13.0 L72.7,12.2 L72.0,10.8 L70.6,10.8 L69.1,11.6 L67.7,11.6 L66.9,13.0 L65.5,13.0 L64.8,11.6 L63.4,11.6 L62.6,10.2 L61.2,10.2 L59.8,9.2 L58.3,10.2 L56.9,10.2 L56.2,11.6 L54.7,12.2 L55.5,13.6 L56.9,14.4 L56.9,15.8 L58.3,16.4 L59.1,17.8 L60.5,18.4 L61.9,17.8 L63.4,18.4 L64.8,17.8 L66.2,18.4 L67.7,17.8 L69.1,18.4 L70.6,17.8 L72.0,18.4 L73.4,17.8 L74.9,17.8 L76.3,17.0 L77.8,17.0 L78.4,15.8 L77.0,14.4 L75.6,14.4 L74.2,15.2 L72.7,15.2 L71.3,14.4 L69.8,15.2 L68.4,15.2 L66.9,14.4 L65.5,15.2 L64.1,14.4 L62.6,14.4 L61.2,13.0 L59.8,13.0 L58.3,13.0 L56.9,13.0 M25.4,4.0 L24.6,5.2 L22.7,4.0 L19.4,4.2 L16.6,7.6 L14.5,7.6 L12.5,9.2 L12.5,11.2 L13.5,12.2 L14.7,11.4 L16.4,11.6 L18.0,10.0 L20.1,10.2 L20.7,11.6 L22.1,11.8 L21.7,13.2 L22.9,14.4 L24.6,14.0 L26.2,14.6 L28.3,16.4 L28.6,18.2 L27.6,19.6 L28.3,21.0 L26.9,21.8 L25.9,23.2 L27.4,24.6 L26.4,26.0 L27.4,27.4 L26.4,28.8 L26.9,30.2 L25.9,31.6 L26.9,33.0 L25.9,34.4 L26.9,35.8 L26.9,37.2 L27.8,38.0 L29.3,38.0 L30.2,36.6 L31.7,36.6 L32.6,35.2 L34.1,35.2 L34.5,33.8 L36.0,33.8 L36.9,32.4 L38.4,32.4 L39.3,31.0 L40.7,31.0 L41.2,29.6 L42.7,29.6 L43.6,28.2 L45.1,28.2 L46.0,26.8 L47.5,26.8 L48.4,25.4 L49.9,25.4 L50.8,24.0 L52.2,24.0 L53.2,22.6 L54.6,22.6 L55.6,21.2 L57.0,21.2 L58.0,19.8 L59.4,19.8 L60.3,18.4 L61.8,18.4 L62.7,17.0 L64.2,17.0 L65.1,15.6 L66.5,15.6 L67.5,14.2 L68.9,14.2 L69.9,12.8 L71.3,12.8 L72.3,11.4 L73.7,11.4 L74.7,10.0 L76.1,10.0 L77.0,8.6 L78.5,8.6 L79.4,7.2 L80.9,7.2 L81.8,5.8 L83.3,5.8 L84.2,4.4 L85.6,4.4 L86.6,3.0 L88.0,3.0 L89.0,1.6 L90.4,1.6 L91.4,0.2";

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isMinimized ? 'pointer-events-none' : 'bg-black'}`}>
      
      {/* 1. MAP LAYER */}
      <div className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMinimized ? 'opacity-0 scale-90 translate-y-20' : 'opacity-100 scale-100'}`}>
        
        {/* Deep Dark Background */}
        <div className="absolute inset-0 bg-[#000000]">
           {/* Grid */}
           <div className="absolute inset-0 opacity-[0.2]" 
                style={{ backgroundImage: 'linear-gradient(#1c1c1e 1px, transparent 1px), linear-gradient(90deg, #1c1c1e 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
           </div>
        </div>

        {/* Real World Map Container */}
        <div className="absolute inset-0 flex items-center justify-center p-0">
          <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
             <defs>
                <filter id="glow-map">
                  <feGaussianBlur stdDeviation="0.2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
             </defs>
             
             {/* The World Map Path - Lighter Fill for Visibility */}
             <path 
                d={worldMapPath} 
                fill="#27272a" 
                stroke="#3f3f46" 
                strokeWidth="0.1"
             />

             {/* Connection Line */}
             <path 
               d={`M ${startPos.x} ${startPos.y} Q ${controlPos.x} ${controlPos.y} ${endPos.x} ${endPos.y}`}
               fill="none"
               stroke="#34c759" 
               strokeWidth="0.1"
               strokeDasharray="0.5 0.5"
               opacity="0.3"
             />

             {/* Animated Progress Line */}
             <path 
                d={`M ${startPos.x} ${startPos.y} Q ${controlPos.x} ${controlPos.y} ${endPos.x} ${endPos.y}`}
                fill="none"
                stroke="#34c759"
                strokeWidth="0.2"
                strokeLinecap="round"
                strokeDasharray="100"
                strokeDashoffset={100 - (progress * 100)}
                pathLength="100"
                filter="url(#glow-map)"
             />

             {/* Dots */}
             <circle cx={startPos.x} cy={startPos.y} r="0.3" fill="#34c759" />
             <circle cx={endPos.x} cy={endPos.y} r="0.3" fill="#34c759" />
          </svg>
        </div>

        {/* Destination Radar Pulse */}
        <div 
           className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
           style={{ left: `${endPos.x}%`, top: `${endPos.y * 2}%` }} 
        >
           <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30"></div>
           <div className="absolute inset-4 rounded-full bg-green-500 shadow-[0_0_20px_#22c55e]"></div>
        </div>

        {/* The Plane Icon */}
        <div 
          className="absolute w-10 h-10 text-white drop-shadow-2xl transition-all duration-1000 ease-linear z-10"
          style={{
            left: `${currentPos.x}%`,
            top: `${currentPos.y * 2}%`, 
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
          }}
        >
          <Plane size={28} fill="currentColor" className="text-white" strokeWidth={0} />
          <div className="absolute top-1/2 right-full h-[2px] w-24 bg-gradient-to-l from-green-400 to-transparent opacity-40 blur-[2px]"></div>
        </div>
      </div>


      {/* 2. CONTROL INTERFACE (iOS Sheet Style) */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[110] flex flex-col transition-transform duration-500 cubic-bezier(0.32,0.72,0,1) ${isMinimized ? 'translate-y-[calc(100%-90px)]' : 'translate-y-0'} pointer-events-auto`}
      >
         {/* Handle Bar Area */}
         <div 
           className="w-full flex justify-center pb-2 pt-4 cursor-pointer"
           onClick={() => setIsMinimized(!isMinimized)}
         >
             <div className="h-1.5 w-12 rounded-full bg-white/30 backdrop-blur-md" />
         </div>

         {/* The Frosted Glass Panel */}
         <div className="mx-2 mb-2 overflow-hidden rounded-[32px] bg-[#1c1c1e]/80 shadow-2xl ios-blur border border-white/10">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-6">
              <div className="flex items-center gap-4">
                 <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                    <Navigation size={22} fill="currentColor" className="opacity-80" />
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-green-500">Focus Mode</div>
                    </div>
                    <div className="text-base font-semibold text-white max-w-[200px] truncate leading-tight">{task.text}</div>
                 </div>
              </div>
              <button 
                onClick={() => setIsMinimized(!isMinimized)} 
                className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
              </button>
            </div>

            {/* Body: Timer & Controls */}
            <div className="flex flex-col items-center justify-center px-6 pb-10 pt-2 relative">
               
               {/* Digital Clock */}
               <div className="relative mb-12 text-center">
                  <div className="text-[5.5rem] font-light tracking-tight text-white tabular-nums leading-none">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-400">
                    Time Remaining
                  </div>
               </div>

               {/* Action Buttons Row */}
               <div className="flex items-center gap-10">
                  {/* Cancel Button (Fixed: z-index and click handling) */}
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-red-500/20 hover:text-red-500 active:scale-95 z-20 relative"
                  >
                    <X size={28} />
                  </button>

                  {/* Play/Pause (Main) */}
                  <button 
                    onClick={() => setIsActive(!isActive)}
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-black shadow-xl transition-all hover:scale-105 active:scale-95 active:bg-slate-200 z-20 relative"
                  >
                    {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
                  </button>

                  {/* Complete */}
                  <button 
                    onClick={onComplete}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-green-500/20 hover:text-green-500 active:scale-95 z-20 relative"
                  >
                    <Check size={28} />
                  </button>
               </div>

               {/* Sound Toggle */}
               <button 
                 onClick={() => setIsMuted(!isMuted)}
                 className="mt-8 flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-20 relative"
               >
                 {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                 {isMuted ? "Sound Off" : "White Noise On"}
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default FocusOverlay;