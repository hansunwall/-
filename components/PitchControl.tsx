import React from 'react';

interface PitchControlProps {
  pitch: number;
  onPitchChange: (pitch: number) => void;
  disabled: boolean;
}

const PitchControl: React.FC<PitchControlProps> = ({ pitch, onPitchChange, disabled }) => {
  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPitchChange(parseFloat(e.target.value));
  };

  const handleReset = () => {
    if (!disabled) {
      onPitchChange(0);
    }
  }

  const isZero = pitch === 0;

  const pitchColorClass = isZero
    ? 'text-green-400'
    : pitch > 0
    ? 'text-red-500 hover:text-red-400'
    : 'text-green-500 hover:text-green-400';

  return (
    <div className="h-full w-full flex flex-col items-center justify-between py-4">
       <span className="font-rajdhani text-xs font-bold text-gray-400 tracking-wider">PITCH CONTROL</span>
      <div className="relative flex-grow w-full flex items-center justify-center py-4">
        {/* Markers */}
        <div className="absolute text-gray-500 text-[10px] right-8 sm:right-12 top-1/4 -translate-y-1/2">-8</div>
        <div className="absolute text-gray-500 text-[10px] right-8 sm:right-12 top-1/2 -translate-y-1/2">0</div>
        <div className="absolute text-gray-500 text-[10px] right-8 sm:right-12 top-3/4 -translate-y-1/2">+8</div>
        
        {/* Slider Track */}
        <div className="relative h-full w-4 bg-black rounded-full shadow-inner overflow-hidden">
            <div className={`absolute left-1/2 -translate-x-1/2 w-1.5 h-1 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isZero ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-gray-700'}`}></div>
        </div>
        <input
          type="range"
          min="-16"
          max="16"
          step="0.1"
          value={pitch}
          onChange={handlePitchChange}
          disabled={disabled}
          className="absolute appearance-none w-full h-full bg-transparent cursor-pointer disabled:cursor-not-allowed 
                     [&::-webkit-slider-thumb]:appearance-none 
                     [&::-webkit-slider-thumb]:h-10 
                     [&::-webkit-slider-thumb]:w-6 
                     [&::-webkit-slider-thumb]:rounded-sm
                     [&::-webkit-slider-thumb]:bg-gray-600 
                     [&::-webkit-slider-thumb]:border-2 
                     [&::-webkit-slider-thumb]:border-gray-500
                     [&::-webkit-slider-thumb]:shadow-md"
          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        />
      </div>
      <button 
        onClick={handleReset}
        disabled={disabled}
        className={`font-rajdhani text-sm px-2 py-1 rounded transition-colors duration-200 disabled:opacity-70 ${pitchColorClass}`}
      >
        {pitch.toFixed(1)}%
      </button>
    </div>
  );
};

export default PitchControl;