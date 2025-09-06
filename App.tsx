import React, { useState, useCallback } from 'react';
import Turntable from './components/Turntable';

declare const jsmediatags: any;

const App: React.FC = () => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [albumArtUrl, setAlbumArtUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const setupAudioContext = () => {
    if (!audioContext) {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(context);
      return context;
    }
    return audioContext;
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setIsLoading(true);
        setError(null);
        setAlbumArtUrl(null);
        setAudioBuffer(null);
        
        const context = setupAudioContext();
        if (context.state === 'suspended') {
            context.resume();
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const decodedData = await context.decodeAudioData(arrayBuffer);
            setAudioBuffer(decodedData);
            
            // Extract album art
            jsmediatags.read(file, {
              onSuccess: (tag: any) => {
                const { picture } = tag.tags;
                if (picture) {
                  const blob = new Blob([new Uint8Array(picture.data)], { type: picture.format });
                  const artUrl = URL.createObjectURL(blob);
                  setAlbumArtUrl(artUrl);
                  // TODO: Clean up this URL when track changes
                }
              },
              onError: (error: any) => {
                console.error('Could not read metadata', error);
                setAlbumArtUrl(null);
              }
            });

        } catch (e) {
            console.error("Failed to decode audio data", e);
            setError("Could not decode the audio file. It may be corrupted or in an unsupported format.");
            setAudioBuffer(null);
        } finally {
            setIsLoading(false);
        }

      } else {
        setError('Please select a valid audio file (e.g., MP3, WAV, OGG).');
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white flex flex-col items-center justify-center p-4 overflow-hidden">
      <header className="w-full max-w-5xl text-center mb-4">
        <h1 className="font-montserrat text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider text-gray-300 drop-shadow-[0_0_10px_rgba(156,163,175,0.4)]">
          DJ 턴테이블 시뮬레이터
        </h1>
        <p className="text-gray-500 text-sm md:text-base mt-2">브라우저에서 즐기는 가상 DJ 턴테이블</p>
      </header>

      <main className="w-full flex-grow flex items-center justify-center">
        {audioBuffer && audioContext ? (
          <Turntable audioBuffer={audioBuffer} audioContext={audioContext} albumArtUrl={albumArtUrl} />
        ) : (
          <div className="w-full max-w-md p-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl flex flex-col items-center text-center font-jua">
              <h2 className="text-3xl font-bold mb-4">트랙 불러오기</h2>
              <p className="text-gray-300 mb-6 text-lg">DJing을 시작하려면, 기기에서 오디오 파일을 불러오세요.</p>
              <label htmlFor="track-upload" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg text-xl">
                오디오 파일 선택
              </label>
              <input 
                id="track-upload" 
                type="file" 
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {isLoading && <p className="mt-4 text-blue-400">트랙 로딩 중...</p>}
              {error && <p className="mt-4 text-red-400">{error}</p>}
          </div>
        )}
      </main>
      <footer className="w-full text-center p-4 text-gray-500 text-xs">
        <p>made by winiron74</p>
      </footer>
    </div>
  );
};

export default App;