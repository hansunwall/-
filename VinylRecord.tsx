import React, { useState, useRef, useEffect } from 'react';

interface VinylRecordProps {
  isPlaying: boolean;
  albumArtUrl: string | null;
  playbackRate: number;
  currentTime: number;
  startScratch: (angle: number) => void;
  endScratch: (shouldResume: boolean) => void;
  scratchToAngle: (angle: number) => void;
}

const VinylRecord: React.FC<VinylRecordProps> = ({ isPlaying, albumArtUrl, playbackRate, currentTime, startScratch, endScratch, scratchToAngle }) => {
  const [isScratching, setIsScratching] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  
  const recordRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef<number>(0);
  const lastAngle = useRef<number>(0);
  const wasPlayingBeforeScratch = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!recordRef.current) return;
    
    wasPlayingBeforeScratch.current = isPlaying;
    setIsScratching(true);
    
    const rect = recordRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const initialAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    
    startScratch(initialAngle);
    lastAngle.current = initialAngle;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!recordRef.current) return;

    const rect = recordRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    
    scratchToAngle(currentAngle);
    
    let deltaAngle = currentAngle - lastAngle.current;
    
    // Handle angle wrapping for smooth visual rotation
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    
    const newRotation = rotationRef.current + (deltaAngle * 180 / Math.PI);
    setRotation(newRotation);
    rotationRef.current = newRotation;
    
    lastAngle.current = currentAngle;
  };

  const handleMouseUp = () => {
    setIsScratching(false);
    endScratch(wasPlayingBeforeScratch.current);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      if (isPlaying && !isScratching) {
        // 33 1/3 RPM = 200 degrees per second.
        // Update at 60fps = 3.33 degrees per frame
        const rotationPerFrame = 3.33 * playbackRate;
        rotationRef.current = (rotationRef.current + rotationPerFrame);
        setRotation(rotationRef.current);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isScratching, playbackRate]);
  
  useEffect(() => {
    if (currentTime < 0.1 && !isPlaying && !isScratching) {
        rotationRef.current = 0;
        setRotation(0);
    }
  }, [currentTime, isPlaying, isScratching]);
  
  return (
    <div
      ref={recordRef}
      className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[360px] md:h-[360px] rounded-full cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      style={{ touchAction: 'none' }}
    >
      <div className="absolute inset-0 bg-gray-900 rounded-full flex items-center justify-center border-4 border-gray-600 shadow-lg">
        {/* Vinyl texture */}
      </div>

      <div
        className="absolute inset-[10px] sm:inset-[15px] rounded-full bg-black transition-transform duration-0 overflow-hidden"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Sheen effect */}
        <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 40%)'}}></div>

        {/* Grooves */}
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-gray-800/30"
            style={{
              inset: `${(100 / 80) * (i + 1) * 0.45}%`,
            }}
          />
        ))}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-full bg-gray-800 flex flex-col items-center justify-center text-gray-300 overflow-hidden border-2 border-gray-600">
          {albumArtUrl ? (
            <img src={albumArtUrl} alt="Album Art" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="font-sans font-bold text-sm sm:text-base tracking-wider">SIDE A</div>
              <div className="w-3/4 h-[1px] bg-gray-600 my-1"></div>
              <div className="text-xs sm:text-sm font-semibold">STEREO</div>
              <div className="text-[8px] sm:text-[10px] mt-1">33⅓ RPM</div>
            </>
          )}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rounded-full border border-gray-500 z-10"></div>
        </div>
      </div>
    </div>
  );
};

export default VinylRecord;