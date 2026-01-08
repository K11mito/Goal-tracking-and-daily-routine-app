import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const Background: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden transition-colors duration-700 ${theme === 'dark' ? 'bg-[#050505]' : 'bg-[#EAEBE8]'}`}>
      
      {theme === 'dark' ? (
        <>
          {/* Deep Dark Forest Base */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050a05] to-[#0a100a] opacity-90"></div>
          
          {/* Moving Blobs - Lime / Emerald / Sunlight */}
          <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full bg-lime-500/10 mix-blend-screen filter blur-[100px] animate-blob"></div>
          <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-600/20 mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[10%] right-[20%] w-[600px] h-[600px] rounded-full bg-lime-400/10 mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000"></div>
          <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-yellow-100/5 mix-blend-screen filter blur-[120px] animate-blob"></div>
        </>
      ) : (
        <>
          {/* Light Mode: Bubba.jpg Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
            style={{ backgroundImage: 'url("bubba.jpg")' }}
          >
             {/* Subtle overlay to ensure interface legibility */}
             <div className="absolute inset-0 bg-sage-50/30 backdrop-blur-[2px]"></div>
          </div>
        </>
      )}
      
      {/* Noise Texture Overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none ${theme === 'dark' ? 'opacity-[0.04] mix-blend-overlay' : 'opacity-[0.05] mix-blend-soft-light'}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />
    </div>
  );
};

export default Background;