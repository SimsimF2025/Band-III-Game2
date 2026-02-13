
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameList, GameMode, Difficulty, CardData, VocabItem } from './types';
import { VOCABULARY } from './vocabulary';
import { getVocabHint } from './geminiService';

// UPDATED URL: Using the exact URL you provided
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycby7FIHOhY5F-1Be-TKeDZpVpIXoAitIpXoMBXCncRgKXG_by0-ADK8yxifRol_sAnpE4g/exec'; 

// --- Sound Utility ---
const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    if (!audioCtx.current) return;
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();

    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);
    
    gain.gain.setValueAtTime(volume, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.current.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.current.destination);

    osc.start();
    osc.stop(audioCtx.current.currentTime + duration);
  };

  const playFlip = () => playSound(400, 'sine', 0.1, 0.05);
  const playMatch = () => {
    playSound(600, 'sine', 0.1, 0.1);
    setTimeout(() => playSound(800, 'sine', 0.15, 0.1), 100);
  };
  const playError = () => playSound(150, 'triangle', 0.3, 0.1);

  return { initAudio, playFlip, playMatch, playError };
};

// --- Helper Components ---

const Header: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({ isMuted, onToggleMute }) => (
  <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
    <div className="flex items-center gap-3">
      <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md shadow-indigo-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <div>
        <h1 className="font-bold text-xl text-slate-900 leading-none">Band III Vocab Master</h1>
        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.2em] font-extrabold">Learning Game</p>
      </div>
    </div>
    <button 
      onClick={onToggleMute}
      className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
      title={isMuted ? "Unmute" : "Mute"}
    >
      {isMuted ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  </header>
);

interface VocabCardProps {
  card: CardData;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
}

const VocabCard: React.FC<VocabCardProps> = ({ card, isFlipped, isMatched, onClick }) => {
  return (
    <div 
      className={`relative w-full aspect-[3/4] cursor-pointer group perspective-1000 ${isMatched ? 'opacity-40 grayscale pointer-events-none' : ''}`}
      onClick={onClick}
    >
      <div className={`card-inner ${isFlipped || isMatched ? 'card-flipped' : ''} shadow-sm group-hover:shadow-md rounded-xl transition-all`}>
        {/* Front */}
        <div className="card-front bg-white border-2 border-slate-100 p-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400">
             <span className="text-xl font-black">?</span>
          </div>
        </div>
        
        {/* Back */}
        <div className={`card-back p-4 border-2 shadow-inner text-center ${card.type === 'term' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-[9px] opacity-70 mb-2 uppercase tracking-[0.15em] font-extrabold">
              {card.isArabic ? 'Meaning' : 'Vocabulary'}
            </span>
            <p className={`font-bold leading-tight break-words overflow-hidden ${card.isArabic ? 'arabic text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
              {card.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    studentName: '',
    studentClass: '',
    score: 0,
    timer: 0,
    isGameStarted: false,
    isGameOver: false,
    matchedPairs: [],
    selectedList: GameList.ListA,
    mode: GameMode.EnglishToArabic,
    difficulty: Difficulty.Easy
  });

  const [isMuted, setIsMuted] = useState(false);
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  const { initAudio, playFlip, playMatch, playError } = useAudio();

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (gameState.isGameStarted && !gameState.isGameOver) {
      interval = setInterval(() => {
        setGameState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isGameStarted, gameState.isGameOver]);

  // Submit Result Effect
  useEffect(() => {
    if (gameState.isGameOver && GOOGLE_SHEET_URL) {
      submitResultToSheet();
    }
  }, [gameState.isGameOver]);

  const submitResultToSheet = async () => {
    if (submitStatus === 'submitting' || submitStatus === 'success') return;
    
    setSubmitStatus('submitting');
    
    const payload = {
      studentName: gameState.studentName,
      studentClass: gameState.studentClass,
      score: gameState.score,
      timer: gameState.timer,
      selectedList: gameState.selectedList,
      difficulty: gameState.difficulty,
      mode: gameState.mode
    };

    try {
      // POSTING TO THE URL
      // We use 'no-cors' mode because Google Apps Script doesn't handle CORS preflight (OPTIONS) well.
      // This means we can't read the response text, but the data will reach the script.
      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      // Since we can't read the response in no-cors, we assume success if no error was thrown.
      setSubmitStatus('success');
    } catch (error) {
      console.error('Submission failed:', error);
      setSubmitStatus('error');
    }
  };

  const initGame = useCallback(() => {
    initAudio(); 
    setSubmitStatus('idle');
    
    let wordCount = 10;
    if (gameState.difficulty === Difficulty.Medium) wordCount = 15;
    if (gameState.difficulty === Difficulty.Hard) wordCount = 20;

    const fullList = VOCABULARY[gameState.selectedList];
    const pool = [...fullList].sort(() => Math.random() - 0.5).slice(0, wordCount);
    
    const gameCards: CardData[] = [];

    pool.forEach((item) => {
      gameCards.push({
        uniqueId: `${item.id}-term`,
        vocabId: item.id,
        content: item.entry,
        type: 'term'
      });
      gameCards.push({
        uniqueId: `${item.id}-match`,
        vocabId: item.id,
        content: gameState.mode === GameMode.EnglishToArabic ? item.meaningArabic : item.meaningEnglish,
        isArabic: gameState.mode === GameMode.EnglishToArabic,
        type: 'match'
      });
    });

    const shuffled = gameCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setGameState(prev => ({
      ...prev,
      score: 0,
      timer: 0,
      isGameStarted: true,
      isGameOver: false,
      matchedPairs: []
    }));
  }, [gameState.selectedList, gameState.mode, gameState.difficulty, initAudio]);

  const handleCardClick = (index: number) => {
    if (flippedCards.length === 2 || flippedCards.includes(index) || gameState.matchedPairs.includes(cards[index].vocabId)) return;

    if (!isMuted) playFlip();
    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const firstCard = cards[newFlipped[0]];
      const secondCard = cards[newFlipped[1]];

      if (firstCard.vocabId === secondCard.vocabId) {
        setTimeout(() => {
          if (!isMuted) playMatch();
          setGameState(prev => {
            const newMatched = [...prev.matchedPairs, firstCard.vocabId];
            const isFinished = newMatched.length === cards.length / 2;
            return {
              ...prev,
              matchedPairs: newMatched,
              score: prev.score + 10,
              isGameOver: isFinished
            };
          });
          setFlippedCards([]);
        }, 600);
      } else {
        setTimeout(() => {
          if (!isMuted) playError();
          setFlippedCards([]);
        }, 1200);
      }
    }
  };

  const showHint = async () => {
    if (gameState.matchedPairs.length === cards.length / 2) return;
    
    const unmatched = cards.filter(c => !gameState.matchedPairs.includes(c.vocabId) && c.type === 'term');
    if (unmatched.length === 0) return;
    
    const randomCard = unmatched[Math.floor(Math.random() * unmatched.length)];
    const vocabData = VOCABULARY[gameState.selectedList].find(v => v.id === randomCard.vocabId);
    
    if (vocabData) {
      setIsLoadingHint(true);
      const hintText = await getVocabHint(vocabData.entry, vocabData.pos);
      setHint(`Hint for "${vocabData.entry}": ${hintText}`);
      setIsLoadingHint(false);
      setTimeout(() => setHint(null), 8000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Screens ---

  if (!gameState.isGameStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200 p-8 border border-slate-100">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Student Portal</h2>
            <p className="text-slate-500 mb-8 font-medium">Master your Band III vocabulary list.</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                    placeholder="Name"
                    value={gameState.studentName}
                    onChange={(e) => setGameState(prev => ({ ...prev, studentName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Class</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                    placeholder="Class"
                    value={gameState.studentClass}
                    onChange={(e) => setGameState(prev => ({ ...prev, studentClass: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                   {Object.values(Difficulty).map(diff => (
                     <button
                       key={diff}
                       className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${gameState.difficulty === diff ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'}`}
                       onClick={() => setGameState(prev => ({ ...prev, difficulty: diff }))}
                     >
                       {diff.split(' (')[0]}
                     </button>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Word List</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium cursor-pointer text-sm"
                    value={gameState.selectedList}
                    onChange={(e) => setGameState(prev => ({ ...prev, selectedList: e.target.value as GameList }))}
                  >
                    {Object.values(GameList).map(list => <option key={list} value={list}>{list}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Mode</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium cursor-pointer text-sm"
                    value={gameState.mode}
                    onChange={(e) => setGameState(prev => ({ ...prev, mode: e.target.value as GameMode }))}
                  >
                    {Object.values(GameMode).map(mode => <option key={mode} value={mode}>{mode}</option>)}
                  </select>
                </div>
              </div>

              <button 
                disabled={!gameState.studentName || !gameState.studentClass}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 mt-4 active:scale-95 uppercase tracking-widest"
                onClick={initGame}
              >
                Start Training
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (gameState.isGameOver) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute top-10 left-10 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
        <div className="absolute top-20 right-20 w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 left-1/4 w-5 h-5 bg-emerald-400 rounded-sm rotate-45"></div>

        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center relative z-10">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h2 className="text-4xl font-black text-slate-900 mb-2">Excellent Work!</h2>
          <p className="text-slate-500 font-semibold mb-6 uppercase tracking-wider text-xs">Performance Summary</p>
          
          {/* Submission Status Indicator */}
          <div className="mb-8 px-4 py-2 rounded-full inline-flex items-center gap-2 border border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest">
            {submitStatus === 'submitting' && (
               <><div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></div><span className="text-amber-600">Syncing with Teacher's Sheet...</span></>
            )}
            {submitStatus === 'success' && (
               <><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-emerald-600">Results Recorded!</span></>
            )}
            {submitStatus === 'error' && (
               <><div className="w-2 h-2 bg-rose-500 rounded-full"></div><span className="text-rose-600">Sync Error</span></>
            )}
            {submitStatus === 'idle' && !GOOGLE_SHEET_URL && (
               <span className="text-slate-400 italic">No Sync Configured</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="block text-xs uppercase tracking-widest text-slate-400 font-black mb-1">Total Score</span>
              <span className="text-3xl font-black text-indigo-600">{gameState.score}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="block text-xs uppercase tracking-widest text-slate-400 font-black mb-1">Time Elapsed</span>
              <span className="text-3xl font-black text-indigo-600">{formatTime(gameState.timer)}</span>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-3xl mb-10 text-left border border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-medium text-slate-400">Student</span>
              <span className="text-sm font-bold text-indigo-400 uppercase">{gameState.studentName}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-medium text-slate-400">Class</span>
              <span className="text-sm font-bold text-indigo-400">{gameState.studentClass}</span>
            </div>
             <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-400">List</span>
              <span className="text-sm font-bold text-indigo-400">{gameState.selectedList}</span>
            </div>
          </div>

          <button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-100 active:scale-95 uppercase tracking-widest"
            onClick={() => setGameState(prev => ({ ...prev, isGameStarted: false }))}
          >
            New Challenge
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-10">
      <Header isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} />
      
      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 shadow-sm sticky top-[73px] z-40">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Score</span>
              <span className="text-lg font-black text-slate-900">{gameState.score}</span>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Timer</span>
              <span className="text-lg font-black text-slate-900">{formatTime(gameState.timer)}</span>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">Difficulty</span>
              <span className="text-lg font-black text-indigo-600">{gameState.difficulty.split(' (')[0]}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">{gameState.studentClass}</span>
              <span className="text-sm font-bold text-slate-700">{gameState.studentName}</span>
            </div>
            <button 
              onClick={showHint}
              disabled={isLoadingHint}
              className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.477.859h4z" />
              </svg>
              Gemini Hint
            </button>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 mt-4">
        {hint && (
          <div className="mb-6 bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-900 font-bold text-center animate-pulse shadow-sm italic text-sm">
            {hint}
          </div>
        )}

        <div className={`grid gap-4 ${gameState.difficulty === Difficulty.Easy ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5' : gameState.difficulty === Difficulty.Medium ? 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6' : 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8'}`}>
          {cards.map((card, idx) => (
            <VocabCard 
              key={card.uniqueId}
              card={card}
              isFlipped={flippedCards.includes(idx)}
              isMatched={gameState.matchedPairs.includes(card.vocabId)}
              onClick={() => handleCardClick(idx)}
            />
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 z-50">
        <div>Content: Band III Core I | Dr. Maram Abu-Rayya</div>
        <div className="flex items-center gap-4">
          <span className="text-indigo-600 font-black">AI Enhanced Study Mode</span>
        </div>
      </footer>
    </div>
  );
}
