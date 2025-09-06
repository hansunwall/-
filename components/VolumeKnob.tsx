import React, { useRef, useCallback } from 'react';

interface VolumeKnobProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  disabled: boolean;
}

const VolumeKnob: React.FC<VolumeKnobProps> = ({ volume, onVolumeChange, disabled }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const startAngleRef = useRef(0);
  const startVolumeRef = useRef(0);

  const angleToVolume = (angle: number): number => {
    // Map angle from -135deg (min) to 135deg (max) to volume 0-1
    const clampedAngle = Math.max(-135, Math.min(135, angle));
    return (clampedAngle + 135) / 270;
  };

  const volumeToAngle = (vol: number): number => {
    // Map volume 0-1 to angle -135deg to 135deg
    return vol * 270 - 135;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!knobRef.current) return;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    
    // This is complex logic to handle the rotation correctly
    // It's not a simple angle calculation
    const deltaAngle = angle - startAngleRef.current;
    
    // A simplified approach: we set volume based on vertical mouse movement
    // This is more intuitive for users than circular motion
    // Let's use the mouse's vertical position relative to the start position
    // This part is tricky, let's stick to a simpler drag logic for now.
    // Let's implement a simpler vertical drag logic.
  }, []);

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);


  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    
    startVolumeRef.current = volume;
    const startY = e.clientY;

    const moveHandler = (moveEvent: MouseEvent) => {
        const deltaY = startY - moveEvent.clientY; // Inverted: drag up = increase
        const sensitivity = 200; // Pixels per full volume range
        const volumeChange = deltaY / sensitivity;
        const newVolume = Math.max(0, Math.min(1, startVolumeRef.current + volumeChange));
        onVolumeChange(newVolume);
    };

    const upHandler = () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);

  }, [disabled, onVolumeChange, volume]);


  const rotation = volumeToAngle(volume);

  return (
    <div className="flex flex-col items-center space-y-1 py-4">
        <span className="font-rajdhani text-xs font-bold text-gray-400 tracking-wider">VOLUME</span>
        <div 
            ref={knobRef}
            className={`relative w-14 h-14 rounded-full bg-gray-700 border-2 border-gray-900 shadow-md flex items-center justify-center ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-ns-resize'}`}
            onMouseDown={handleMouseDown}
        >
            <div 
                className="w-10 h-10 rounded-full bg-gray-800 shadow-inner"
                style={{ transform: `rotate(${rotation}deg)`}}
            >
                <div className="w-full h-1/2 flex justify-center items-start pt-1">
                    <div className="h-2 w-1 bg-gray-500 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default VolumeKnob;