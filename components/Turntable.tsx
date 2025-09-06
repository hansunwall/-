import React, { useState } from 'react';
import VinylRecord from './VinylRecord';
import PitchControl from './PitchControl';
import VolumeKnob from './VolumeKnob';
import { useAudioEngine } from '../hooks/useAudioEngine';

interface TurntableProps {
  audioBuffer: AudioBuffer;
  audioContext: AudioContext;
  albumArtUrl: string | null;
}

const Turntable: React.FC<TurntableProps> = ({ audioBuffer, audioContext, albumArtUrl }) => {
  const [isPowerOn, setIsPowerOn] = useState<boolean>(false);
  const [showPowerGuide, setShowPowerGuide] = useState<boolean>(true);
  
  const {
    isReady,
    isPlaying,
    currentTime,
    pitch,
    rpm,
    volume,
    setVolume,
    togglePlayPause,
    setPitch,
    setRpm,
    startScratch,
    endScratch,
    scratchToAngle,
  } = useAudioEngine({ audioBuffer, audioContext });

  const handlePlayPause = () => {
    if (!isPowerOn || !isReady) return;
    togglePlayPause();
  };

  const handlePowerToggle = () => {
    const newPowerState = !isPowerOn;
    if (showPowerGuide) {
      setShowPowerGuide(false);
    }
    if (!newPowerState && isPlaying) {
        togglePlayPause(); // This will pause the track
    }
    setIsPowerOn(newPowerState);
  }

  return (
    <div className="relative w-full max-w-5xl h-[450px] sm:h-[500px] bg-gradient-to-b from-[#4a4a50] via-[#3a3a40] to-[#2a2a30] rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-row justify-between select-none border-t-2 border-[#5a5a5e] border-l-2 border-[#5a5a5e] border-b-2 border-[#1a1a1e] border-r-2 border-[#1a1a1e]">
      
      {/* --- Power On Guide Overlay --- */}
      {showPowerGuide && !isPowerOn && (
         <div className="absolute inset-0 z-30 rounded-2xl flex items-center justify-center pointer-events-none" style={{ background: 'radial-gradient(circle at calc(1.5rem + 24px) calc(1.5rem + 24px), transparent 0%, transparent 60px, rgba(0,0,0,0.7) 70px)'}}>
            <div className="relative text-center ml-24 sm:ml-32 font-jua">
                <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">전원을 켜주세요</h3>
                <p className="text-blue-200 text-sm">손잡이를 클릭하여 시작하세요</p>
            </div>
        </div>
      )}

      {/* Left side: Platter and Controls */}
      <div className="relative w-4/5 h-full">
        {/* Power Knob & Strobe */}
        <div className="absolute top-2 left-2 flex items-center space-x-2 z-20">
            <div className="relative w-12 h-12 rounded-full bg-gray-900 shadow-inner flex items-center justify-center">
                <div
                onClick={handlePowerToggle}
                className="w-10 h-10 rounded-full bg-gray-700 cursor-pointer border-2 border-gray-600 shadow-md transition-transform duration-300 ease-in-out"
                style={{ transform: `rotate(${isPowerOn ? '90deg' : '0deg'})` }}
                >
                <div className="w-full h-1/2 flex justify-center items-start pt-1">
                    <div className="h-1.5 w-0.5 bg-gray-500 rounded-full"></div>
                </div>
                </div>
            </div>
            <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center shadow-inner">
                <div className={`w-3 h-3 bg-red-800 rounded-full transition-all duration-300 ${isPowerOn ? 'bg-red-500 shadow-[0_0_8px_red]' : ''}`}></div>
            </div>
        </div>

        {/* START/STOP and RPM Controls */}
        <div className="absolute bottom-2 left-2 z-20 flex space-x-2">
          <button
              onClick={handlePlayPause}
              disabled={!isPowerOn || !isReady}
              className="w-20 h-12 sm:w-24 sm:h-14 bg-[#555] border-b-4 border-[#333] active:border-b-0 rounded-md flex items-center justify-center shadow-md active:shadow-inner disabled:opacity-50 disabled:cursor-not-allowed group"
          >
              <span className="font-rajdhani text-xs sm:text-sm font-bold tracking-wider text-gray-300 group-hover:text-white transition-colors whitespace-nowrap">START·STOP</span>
          </button>
          <div className="flex items-center space-x-2">
             <div className="flex flex-col items-center">
                <button disabled={!isPowerOn || !isReady} onClick={() => setRpm(33)} className={`w-8 h-8 text-sm rounded-full font-rajdhani font-bold transition-all duration-200 disabled:opacity-50 flex items-center justify-center border-2 border-gray-900 bg-gray-700 active:bg-gray-600 text-gray-300`}>33</button>
                <div className={`mt-1 w-2 h-2 rounded-full transition-all duration-200 ${isPowerOn && rpm === 33 ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-gray-900'}`}></div>
             </div>
             <div className="flex flex-col items-center">
                <button disabled={!isPowerOn || !isReady} onClick={() => setRpm(45)} className={`w-8 h-8 text-sm rounded-full font-rajdhani font-bold transition-all duration-200 disabled:opacity-50 flex items-center justify-center border-2 border-gray-900 bg-gray-700 active:bg-gray-600 text-gray-300`}>45</button>
                <div className={`mt-1 w-2 h-2 rounded-full transition-all duration-200 ${isPowerOn && rpm === 45 ? 'bg-red-500 shadow-[0_0_4px_red]' : 'bg-gray-900'}`}></div>
             </div>
          </div>
        </div>
        
        {/* Platter and Vinyl */}
        <div className="absolute inset-0 flex items-center justify-center">
            {/* Platter */}
            <div className="absolute w-[380px] h-[380px] sm:w-[420px] sm:h-[420px] bg-[#2c2c2c] rounded-full shadow-lg border-4 border-black flex items-center justify-center">
                <div className="absolute inset-0 rounded-full">
                    {/* Strobe dots */}
                    {Array.from({ length: 120 }).map((_, i) => (
                    <div key={`strobe-${i}`} className="absolute w-full h-full" style={{ transform: `rotate(${i * 3}deg)` }}>
                        <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] bg-[#111] rounded-full" />
                    </div>
                    ))}
                </div>
                 <div className="w-[95%] h-[95%] bg-[#222] rounded-full shadow-inner border-2 border-black"></div>
            </div>

            <VinylRecord
             isPlaying={isPlaying && isPowerOn}
             albumArtUrl={albumArtUrl}
             playbackRate={ (rpm === 45 ? 45/33.3 : 1) * (1 + pitch / 100) }
             currentTime={currentTime}
             startScratch={startScratch}
             endScratch={endScratch}
             scratchToAngle={scratchToAngle}
          />
        </div>
      </div>

      {/* Right side: Pitch Control & Volume */}
      <div className="w-1/5 h-full flex flex-col items-center justify-start pl-2 sm:pl-4">
          <VolumeKnob volume={volume} onVolumeChange={setVolume} disabled={!isPowerOn || !isReady} />
          <div className="w-full flex-grow">
            <PitchControl pitch={pitch} onPitchChange={setPitch} disabled={!isPowerOn || !isReady} />
          </div>
      </div>
    </div>
  );
};

export default Turntable;