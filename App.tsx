
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameList, GameMode, Difficulty, CardData, VocabItem } from './types';
import { VOCABULARY } from './vocabulary';
import { getVocabHint } from './geminiService';

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycby7FIHOhY5F-1Be-TKeDZpVpIXoAitIpXoMBXCncRgKXG_by0-ADK8yxifRol_sAnpE4g/exec'; 

const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    try {
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
    } catch (e) {
      console.warn("Audio play blocked/failed:", e);
    }
  };

  const playFlip = () => playSound(400, 'sine', 0.1, 0.05);
  const playMatch = () => {
    playSound(600, 'sine', 0.1, 0.1);
    setTimeout(() => playSound(800, 'sine', 0.15, 0.1), 100);
  };
  const playError = () => playSound(150, 'triangle', 0.3, 0.1);

  return { initAudio, playFlip, playMatch, playError };
};

const Header: React.FC<{ isMuted: boolean; onToggleMute: () => void }> = ({ isMuted, onToggleMute }) => (
  <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
    <div className="flex items-center gap-3">
      <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md">
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
    >
      {isMuted ? "🔇" : "🔊"}
    </button>
  </header>
);

const VocabCard: React.FC<{ card: CardData; isFlipped: boolean; isMatched: boolean; onClick: () => void }> = ({ card, isFlipped, isMatched, onClick }) => (
  <div 
    className={`relative w-full aspect-[3/4] cursor-pointer group perspective-1000 ${isMatched ? 'opacity-40 grayscale pointer-events-none' : ''}`}
    onClick={onClick}
  >
    <div className={`card-inner ${isFlipped || isMatched ? 'card-flipped' : ''} shadow-sm rounded-xl transition-all`}>
      <div className="card-front bg-white border-2 border-slate-100 p-4">
        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400">
           <span className="text-xl font-black">?</span>
        </div>
      </div>
      <div className={`card-back p-4 border-2 shadow-inner text-center ${card.type === 'term' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`}>
        <div className="flex flex-col items-center justify-center h-full">
          <span className="text-[9px] opacity-70 mb-1 uppercase tracking-[0.15em] font-extrabold">
            {card.isArabic ? 'Meaning' : 'Vocabulary'}
          </span>
          <p className={`font-bold leading-tight break-words overflow-hidden ${card.isArabic ? 'arabic text-lg' : 'text-sm'}`}>
            {card.content}
          </p>
        </div>
      </div>
    </div>
  </div>
);

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

  useEffect(() => {
    let interval: any;
    if (gameState.isGameStarted && !gameState.isGameOver) {
      interval = setInterval(() => setGameState(prev => ({ ...prev, timer: prev.timer + 1 })), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isGameStarted, gameState.isGameOver]);

  useEffect(() => {
    if (gameState.isGameOver) submitResultToSheet();
  }, [gameState.isGameOver]);

  const submitResultToSheet = async () => {
    if (submitStatus === 'submitting' || submitStatus === 'success') return;
    setSubmitStatus('submitting');
    try {
      await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          studentName: gameState.studentName,
          studentClass: gameState.studentClass,
          score: gameState.score,
          timer: gameState.timer,
          selectedList: gameState.selectedList,
          difficulty: gameState.difficulty,
          mode: gameState.mode
        }),
      });
      setSubmitStatus('success');
    } catch (error) {
      setSubmitStatus('error');
    }
  };

  const initGame = useCallback(() => {
    initAudio(); 
    setSubmitStatus('idle');
    let wordCount = gameState.difficulty.includes('Hard') ? 20 : gameState.difficulty.includes('Medium') ? 15 : 10;
    const pool = [...VOCABULARY[gameState.selectedList]].sort(() => Math.random() - 0.5).slice(0, wordCount);
    const gameCards: CardData[] = [];
    pool.forEach(item => {
      gameCards.push({ vocabId: item.id, uniqueId: `${item.id}-t`, content: item.entry, type: 'term' });
      gameCards.push({
        vocabId: item.id, uniqueId: `${item.id}-m`,
        content: gameState.mode === GameMode.EnglishToArabic ? item.meaningArabic : item.meaningEnglish,
        isArabic: gameState.mode === GameMode.EnglishToArabic, type: 'match'
      });
    });
    setCards(gameCards.sort(() => Math.random() - 0.5));
    setFlippedCards([]);
    setGameState(prev => ({ ...prev, score: 0, timer: 0, isGameStarted: true, isGameOver: false, matchedPairs: [] }));
  }, [gameState.selectedList, gameState.mode, gameState.difficulty]);

  const handleCardClick = (index: number) => {
    if (flippedCards.length === 2 || flippedCards.includes(index) || gameState.matchedPairs.includes(cards[index].vocabId)) return;
    if (!isMuted) playFlip();
    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);
    if (newFlipped.length === 2) {
      if (cards[newFlipped[0]].vocabId === cards[newFlipped[1]].vocabId) {
        setTimeout(() => {
          if (!isMuted) playMatch();
          setGameState(prev => {
            const newMatched = [...prev.matchedPairs, cards[newFlipped[0]].vocabId];
            return { ...prev, matchedPairs: newMatched, score: prev.score + 10, isGameOver: newMatched.length === cards.length / 2 };
          });
          setFlippedCards([]);
        }, 600);
      } else {
        setTimeout(() => { if (!isMuted) playError(); setFlippedCards([]); }, 1200);
      }
    }
  };

  const showHint = async () => {
    const unmatched = cards.filter(c => !gameState.matchedPairs.includes(c.vocabId) && c.type === 'term');
    if (unmatched.length === 0) return;
    const randomCard = unmatched[Math.floor(Math.random() * unmatched.length)];
    const vocabData = VOCABULARY[gameState.selectedList].find(v => v.id === randomCard.vocabId);
    if (vocabData) {
      setIsLoadingHint(true);
      const hintText = await getVocabHint(vocabData.entry, vocabData.pos);
      setHint(`Hint: ${hintText}`);
      setIsLoadingHint(false);
      setTimeout(() => setHint(null), 8000);
    }
  };

  if (!gameState.isGameStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
            <h2 className="text-3xl font-black text-slate-900 mb-2 text-center sm:text-left">Student Portal</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" placeholder="Name" value={gameState.studentName} onChange={(e) => setGameState(prev => ({ ...prev, studentName: e.target.value }))} />
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" placeholder="Class" value={gameState.studentClass} onChange={(e) => setGameState(prev => ({ ...prev, studentClass: e.target.value }))} />
              </div>
              <select className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={gameState.difficulty} onChange={(e) => setGameState(prev => ({ ...prev, difficulty: e.target.value as Difficulty }))}>
                {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm" value={gameState.selectedList} onChange={(e) => setGameState(prev => ({ ...prev, selectedList: e.target.value as GameList }))}>
                {Object.values(GameList).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button disabled={!gameState.studentName || !gameState.studentClass} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg" onClick={initGame}>Start Training</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (gameState.isGameOver) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-2">Excellent Work!</h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-2xl border">Score: <span className="font-black text-indigo-600">{gameState.score}</span></div>
            <div className="bg-slate-50 p-4 rounded-2xl border">Time: <span className="font-black text-indigo-600">{gameState.timer}s</span></div>
          </div>
          <button className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl" onClick={() => setGameState(prev => ({ ...prev, isGameStarted: false }))}>New Challenge</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-10">
      <Header isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} />
      <div className="bg-white border-b px-6 py-4 shadow-sm sticky top-[73px] z-40 flex justify-between items-center">
        <div className="flex gap-6 items-center">
          <div><span className="text-[10px] font-black uppercase text-slate-400">Score</span><div className="font-black leading-none">{gameState.score}</div></div>
          <div><span className="text-[10px] font-black uppercase text-slate-400">Timer</span><div className="font-black leading-none">{gameState.timer}s</div></div>
          <button onClick={showHint} disabled={isLoadingHint} className="bg-amber-100 px-3 py-1 rounded-lg text-[10px] font-bold text-amber-700">Hint</button>
        </div>
        <div className="text-right leading-none">
          <div className="font-bold text-slate-700 text-sm">{gameState.studentName}</div>
          <span className="text-slate-400 text-[10px] uppercase font-bold">{gameState.studentClass}</span>
        </div>
      </div>
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6">
        {hint && <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-center text-xs font-medium animate-pulse">{hint}</div>}
        <div className={`grid gap-3 sm:gap-4 ${gameState.difficulty.includes('Easy') ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6'}`}>
          {cards.map((card, idx) => (
            <VocabCard key={card.uniqueId} card={card} isFlipped={flippedCards.includes(idx)} isMatched={gameState.matchedPairs.includes(card.vocabId)} onClick={() => handleCardClick(idx)} />
          ))}
        </div>
      </main>
    </div>
  );
}
