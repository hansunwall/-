import { useState, useRef, useEffect, useCallback } from 'react';

type Rpm = 33 | 45;

interface UseAudioEngineProps {
  audioBuffer: AudioBuffer | null;
  audioContext: AudioContext | null;
}

const WORKLET_PROCESSOR_CODE = `
class ScratchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._buffer = [];
        this._bufferLength = 0;
        this._playhead = 0; // Position in samples
        this._playbackRate = 0.0;
        this._isScratching = false;
        this._initialized = false;
        this._lastRate = 0;
        
        // --- Angle-based scratching state ---
        this._initialScratchAngle = 0;
        this._initialScratchPlayhead = 0;
        this._scratchTargetPlayhead = 0;
        this._accumulatedScratchAngle = 0;
        this._lastScratchAngle = 0;
        this._radiansToSeconds = (60 / 33.333) / (2 * Math.PI);
        this._scratchSmoothing = 0.65; // faster response so reverse audio is clearer
        this._maxScratchDelta = sampleRate * 0.2; // allow larger per-block movement (~200ms) for audible reverse

        this._lastUpdateTime = 0;
        this._updateInterval = 1 / 20; // ~20hz update rate

        this.port.onmessage = ({ data }) => {
            if (data.type === 'init') {
                this._buffer = data.payload;
                this._bufferLength = this._buffer[0]?.length || 0;
                this._initialized = true;
                this._playhead = 0;
                this._playbackRate = 0;
                this._isScratching = false;
                this.port.postMessage({ type: 'initialized' });
            } else if (data.type === 'update-rate') {
                this._playbackRate = data.playbackRate;
            } else if (data.type === 'start-scratch') {
                this._isScratching = true;
                this._initialScratchAngle = data.angle;
                this._lastScratchAngle = data.angle;
                this._accumulatedScratchAngle = 0;
                this._initialScratchPlayhead = this._playhead;
                this._scratchTargetPlayhead = this._playhead; // Sync target initially
                this._lastRate = 0;
            } else if (data.type === 'scratch-to-angle') {
                if (this._isScratching) {
                    let deltaAngle = data.angle - this._lastScratchAngle;
                    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
                    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

                    this._accumulatedScratchAngle += deltaAngle;
                    this._lastScratchAngle = data.angle;

                    const timeDelta = this._accumulatedScratchAngle * this._radiansToSeconds;
                    const sampleDelta = timeDelta * sampleRate;
                    const newPlayhead = this._initialScratchPlayhead + sampleDelta;
                    // Clamp to buffer to avoid huge jumps that create clicks
                    this._scratchTargetPlayhead = Math.max(0, Math.min(this._bufferLength - 1, newPlayhead));
                }
            } else if (data.type === 'end-scratch') {
                this._isScratching = false;
                // After scratching, ensure the main playhead is synced to the last target.
                this._playhead = this._scratchTargetPlayhead;
            }
        };
    }

    process(inputs, outputs) {
        if (!this._initialized) return true;
        
        const output = outputs[0];
        const blockSize = output[0].length;
        const bufferLength = this._bufferLength;
        if (bufferLength === 0) return true;

        const startPlayhead = this._playhead;
        const targetPlayhead = this._isScratching
            ? this._scratchTargetPlayhead
            : startPlayhead + (this._playbackRate * blockSize);

        // Smooth and clamp rate while scratching to reduce audible zipper noise
        const desiredRate = (targetPlayhead - startPlayhead) / blockSize;
        const maxRate = this._maxScratchDelta / blockSize;
        const clampedRate = Math.max(-maxRate, Math.min(maxRate, desiredRate));
        const rate = this._isScratching
            ? this._lastRate + (clampedRate - this._lastRate) * this._scratchSmoothing
            : desiredRate;
        this._lastRate = rate;

        let endPlayhead = startPlayhead + (rate * blockSize);

        const numChannels = Math.min(this._buffer.length, output.length);
        for (let channel = 0; channel < numChannels; channel++) {
            const outputChannel = output[channel];
            const bufferChannel = this._buffer[channel];
            
            for (let i = 0; i < blockSize; i++) {
                const currentPlayhead = startPlayhead + (i * rate);
                const floor = Math.floor(currentPlayhead);
                const ceil = floor + 1;
                
                if (floor < 0 || ceil >= bufferLength) {
                    outputChannel[i] = 0;
                } else {
                    const frac = currentPlayhead - floor;
                    const s1 = bufferChannel[floor];
                    const s2 = bufferChannel[ceil];
                    outputChannel[i] = s1 + (s2 - s1) * frac; 
                }
            }
        }
        
        this._playhead = endPlayhead;
        
        if (this._playhead >= bufferLength - 1 && this._playbackRate > 0 && !this._isScratching) {
            this._playhead = bufferLength - 1;
            this._playbackRate = 0;
            this.port.postMessage({ type: 'track-end' });
        }
        if (this._playhead < 0) {
            this._playhead = 0;
        }
        
        if (currentTime > this._lastUpdateTime + this._updateInterval ) {
            this.port.postMessage({ type: 'time-update', playhead: this._playhead });
            this._lastUpdateTime = currentTime;
        }
        
        return true;
    }
}
registerProcessor('scratch-processor', ScratchProcessor);
`;

export const useAudioEngine = ({ audioBuffer, audioContext }: UseAudioEngineProps) => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pitch, setPitch] = useState(0);
  const [rpm, setRpm] = useState<Rpm>(33);
  const [volume, setVolumeState] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);

  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const trackEndedRef = useRef(false);
  
  const getPlaybackRate = useCallback(() => {
    const rpmMultiplier = rpm === 45 ? 45 / 33.333 : 1;
    const pitchMultiplier = 1 + pitch / 100;
    return rpmMultiplier * pitchMultiplier;
  }, [rpm, pitch]);
  
  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
  }, []);


  useEffect(() => {
    if (!audioContext || !audioBuffer) return;

    let isMounted = true;
    let processorUrl: string | undefined;
    setIsReady(false);

    const setupAudioGraph = async () => {
      try {
        const processorBlob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
        processorUrl = URL.createObjectURL(processorBlob);
        await audioContext.audioWorklet.addModule(processorUrl);
       
        if (!isMounted) return;
        
        const node = new AudioWorkletNode(audioContext, 'scratch-processor');
        const gainNode = audioContext.createGain();
        
        workletNodeRef.current = node;
        gainNodeRef.current = gainNode;

        node.port.onmessage = ({ data }) => {
          if (!isMounted) return;

          if (data.type === 'initialized') {
             setIsReady(true);
          } else if (data.type === 'time-update' && audioContext) {
            setCurrentTime(data.playhead / audioContext.sampleRate);
          } else if (data.type === 'track-end') {
            setIsPlaying(false);
            trackEndedRef.current = true;
          }
        };

        const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, i) => audioBuffer.getChannelData(i));
        node.port.postMessage({ type: 'init', payload: channels });

        node.connect(gainNode).connect(audioContext.destination);

      } catch (error) {
        console.error('Error setting up AudioWorklet:', error);
      }
    };

    setupAudioGraph();
    
    return () => {
      isMounted = false;
      if (processorUrl) {
        URL.revokeObjectURL(processorUrl);
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setIsReady(false);
    };
  }, [audioContext, audioBuffer]);
  
  useEffect(() => {
    if (gainNodeRef.current && audioContext) {
        gainNodeRef.current.gain.setTargetAtTime(volume, audioContext.currentTime, 0.01);
    }
  }, [volume, audioContext]);

  useEffect(() => {
    if (workletNodeRef.current && isReady && isPlaying) {
        workletNodeRef.current.port.postMessage({
            type: 'update-rate',
            playbackRate: getPlaybackRate()
        });
    }
  }, [pitch, rpm, isReady, isPlaying, getPlaybackRate]);
  

  const togglePlayPause = useCallback(async () => {
    if (!audioContext || !isReady || !workletNodeRef.current) return;

    const newIsPlaying = !isPlaying;

    if (newIsPlaying && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    if (newIsPlaying) {
      if (trackEndedRef.current) {
        // Reset playhead to 0 by sending a scratch message
        workletNodeRef.current.port.postMessage({ type: 'start-scratch', angle: 0 }); // A dummy angle
        workletNodeRef.current.port.postMessage({ type: 'scratch-to-angle', angle: 0 });
        workletNodeRef.current.port.postMessage({ type: 'end-scratch' });
        setCurrentTime(0);
        trackEndedRef.current = false;
      }
      workletNodeRef.current.port.postMessage({ type: 'update-rate', playbackRate: getPlaybackRate() });
    } else {
      workletNodeRef.current.port.postMessage({ type: 'update-rate', playbackRate: 0 });
    }
    setIsPlaying(newIsPlaying);
    
  }, [audioContext, isReady, isPlaying, getPlaybackRate]);

  const startScratch = useCallback((angle: number) => {
    if (!isReady || !workletNodeRef.current) return;
    workletNodeRef.current.port.postMessage({ type: 'start-scratch', angle });
  }, [isReady]);

  const scratchToAngle = useCallback((angle: number) => {
    if (!isReady || !workletNodeRef.current) return;
    workletNodeRef.current.port.postMessage({
        type: 'scratch-to-angle',
        angle
    });
  }, [isReady]);

  const endScratch = useCallback((shouldResume: boolean) => {
    if (!isReady || !workletNodeRef.current) return;
    workletNodeRef.current.port.postMessage({ type: 'end-scratch' });
    
    setIsPlaying(shouldResume);
    if (shouldResume) {
        workletNodeRef.current.port.postMessage({ type: 'update-rate', playbackRate: getPlaybackRate() });
    } else {
        workletNodeRef.current.port.postMessage({ type: 'update-rate', playbackRate: 0 });
    }
  }, [isReady, getPlaybackRate]);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration: audioBuffer?.duration || 0,
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
  };
};
