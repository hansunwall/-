import React, { useState, useEffect } from 'react';
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

  // Clean up album art object URLs when they change or on unmount
  useEffect(() => {
    if (!albumArtUrl) return;
    return () => {
      URL.revokeObjectURL(albumArtUrl);
    };
  }, [albumArtUrl]);
  
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
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-8 rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-200 text-xl font-bold">1</div>
                <div>
                  <h2 className="text-2xl font-bold text-white">트랙을 올려보세요</h2>
                  <p className="text-gray-300 text-sm">MP3, WAV 등 오디오 파일을 드래그하거나 선택하세요.</p>
                </div>
              </div>
              <label
                htmlFor="track-upload"
                className="relative block w-full h-48 rounded-xl border-2 border-dashed border-gray-500/60 hover:border-blue-400 transition-colors duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
                <div className="relative z-10 h-full flex flex-col items-center justify-center space-y-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-800/60 border border-white/10 flex items-center justify-center text-2xl">📀</div>
                  <div className="text-white font-semibold text-lg">파일 선택 또는 드래그</div>
                  <div className="text-gray-300 text-sm">한 번에 한 곡씩 업로드됩니다.</div>
                </div>
              </label>
              <input
                id="track-upload"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mt-4 flex items-center space-x-3 text-sm text-gray-300">
                <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`} />
                <span>{isLoading ? '트랙 로딩 중...' : '준비 완료: 오디오 파일을 올려주세요.'}</span>
              </div>
              {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/30 border border-white/5 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-200 font-bold">2</div>
                <div>
                  <h3 className="text-xl font-bold text-white">전원 ON</h3>
                  <p className="text-gray-300 text-sm">좌측 상단 노브를 돌려 전원을 켜세요.</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-200 font-bold">3</div>
                <div>
                  <h3 className="text-xl font-bold text-white">스타트 & 스크래치</h3>
                  <p className="text-gray-300 text-sm">START 버튼으로 재생, 바이닐을 드래그해 스크래치!</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-200 font-bold">4</div>
                <div>
                  <h3 className="text-xl font-bold text-white">톤 & 피치</h3>
                  <p className="text-gray-300 text-sm">우측 노브/슬라이더로 볼륨과 피치를 미세조정.</p>
                </div>
              </div>
            </div>
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
