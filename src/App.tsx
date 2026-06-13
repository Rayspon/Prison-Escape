import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserX, UserRoundX, Brain, Briefcase, Crown, ShieldAlert, 
  Lock, Cctv, Users, PackageOpen, AlertTriangle, Coins, Target,
  Zap, Eye, Heart, BarChart, ArrowRight, Play, RefreshCcw, LogOut,
  Ghost, Skull, VenetianMask, Bot, HardHat, User, UserRound
} from 'lucide-react';
import { Character, Stat, Encounter, Action, Item, Zone, LevelMap, Entity, Skin } from './types';
import { CHARACTERS, ZONES, generateLevelMap } from './gameData';

import { Map3D } from './components/Map3D';

const ICONS: Record<string, React.ElementType> = {
  UserX, UserRoundX, Brain, Briefcase, Crown,
  ShieldAlert, Lock, Cctv, Users, PackageOpen,
  Ghost, Skull, VenetianMask, Bot, HardHat, User, UserRound
};

// --- Helper Functions ---
function calculateRank(score: number): string {
  if (score >= 3500) return 'S';
  if (score >= 3000) return 'A';
  if (score >= 2000) return 'B';
  if (score >= 1000) return 'C';
  return 'D';
}

function resolveRoll(
  action: Action,
  playerStats: Record<Exclude<Stat, 'none'>, number>,
  inventory: Item[]
) {
  if (action.stat === 'none') {
    return true; // No roll needed (e.g. bribes, ignore)
  }

  const baseStat = playerStats[action.stat] || 0;
  const itemBonus = inventory
    .filter(i => i.bonusStat === action.stat)
    .reduce((acc, curr) => acc + curr.bonusAmount, 0);

  const roll = Math.floor(Math.random() * 10) + 1; // 1 to 10
  const total = baseStat + itemBonus + roll;
  
  return total >= action.dc;
}

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'victory'>('menu');
  const [character, setCharacter] = useState<Character | null>(null);
  
  // Player State
  const [level, setLevel] = useState(1);
  const [suspicion, setSuspicion] = useState(0);
  const [money, setMoney] = useState(0);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  // 2D Map State
  const [levelMap, setLevelMap] = useState<LevelMap | null>(null);
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);

  // Meta State
  const [highestRank, setHighestRank] = useState<string>('D');

  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedSkinIndex, setSelectedSkinIndex] = useState(0);

  // Player Rendering Skin
  const [playerSkin, setPlayerSkin] = useState<Skin | null>(null);

  useEffect(() => {
    const savedRank = localStorage.getItem('jailbreak_highest_rank');
    if (savedRank) setHighestRank(savedRank);
  }, []);

  const startGame = (selectedChar: Character, skinIdx: number) => {
    setCharacter(selectedChar);
    setPlayerSkin(selectedChar.skins[skinIdx]);
    setLevel(1);
    setSuspicion(0);
    setMoney(selectedChar.startingMoney);
    setInventory([]);
    setScore(0);
    setLogs([`Began escape attempt as ${selectedChar.name} (${selectedChar.skins[skinIdx].name}).`]);
    const map = generateLevelMap(1);
    setLevelMap(map);
    setPlayerPos({ x: map.startX, y: map.startY });
    setActiveEntity(null);
    setGameState('playing');
  };

  const completeLevel = () => {
    if (level >= 30) {
      const finalScore = (30 * 100) - (suspicion * 10) + (money * 5);
      setScore(finalScore);
      const rank = calculateRank(finalScore);
      if (rank === 'S' || (rank === 'A' && highestRank !== 'S')) {
        setHighestRank(rank);
        localStorage.setItem('jailbreak_highest_rank', rank);
      }
      setGameState('victory');
    } else {
      const nextLevel = level + 1;
      const map = generateLevelMap(nextLevel);
      setLevel(nextLevel);
      setLevelMap(map);
      setPlayerPos({ x: map.startX, y: map.startY });
      setActiveEntity(null);
      setScore(s => s + 100);
      setLogs(prev => [`[Lvl ${nextLevel}] Advanced to next sector.`, ...prev]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || activeEntity || !levelMap) return;

      let dx = 0, dy = 0;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': dy = -1; break;
        case 'ArrowDown': case 's': case 'S': dy = 1; break;
        case 'ArrowLeft': case 'a': case 'A': dx = -1; break;
        case 'ArrowRight': case 'd': case 'D': dx = 1; break;
        default: return;
      }

      e.preventDefault();

      const targetX = playerPos.x + dx;
      const targetY = playerPos.y + dy;

      if (targetX < 0 || targetX >= levelMap.width || targetY < 0 || targetY >= levelMap.height) return;
      if (levelMap.walls[targetY][targetX]) return;

      // Check if we are directly stepping onto an entity
      const entityOnTarget = levelMap.entities.find(e => e.x === targetX && e.y === targetY && !e.resolved);

      // Check for proximity triggers (Guards & Cameras)
      const adjacentEntity = levelMap.entities.find(e => {
         if (e.resolved) return false;
         if (e.type !== 'guard' && e.type !== 'camera') return false;
         
         // Don't trigger proximity twice if we are stepping directly on it
         if (e.x === targetX && e.y === targetY) return false;

         const dist = Math.abs(e.x - targetX) + Math.abs(e.y - targetY);
         return dist === 1; // Adjacent horizontally or vertically
      });

      if (entityOnTarget) {
        if (entityOnTarget.type === 'exit') {
           completeLevel();
           return;
        }
        if (!entityOnTarget.resolved) {
           setActiveEntity(entityOnTarget);
           return; // Do NOT update player position (stand in front of it)
        }
      }

      if (adjacentEntity) {
          setPlayerPos({ x: targetX, y: targetY }); // Move into the danger zone
          setActiveEntity(adjacentEntity);
          return;
      }

      setPlayerPos({ x: targetX, y: targetY });
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, playerPos, activeEntity, levelMap, level, suspicion, money]);

  const handleAction = (action: Action) => {
    if (!character || !activeEntity) return;

    if (action.cost && action.cost > money) {
      setLogs(prev => [`Not enough money for: ${action.label}`, ...prev]);
      return;
    }

    let isSuccess = resolveRoll(action, character.stats, inventory);
    
    if (action.cost && action.cost <= money) {
      setMoney(m => m - action.cost!);
      isSuccess = true;
    }

    const result = isSuccess ? action.onSuccess : action.onFailure;
    
    setSuspicion(prev => {
      const next = Math.max(0, prev + result.suspicionChange);
      return next;
    });

    if (isSuccess && result.moneyReward) setMoney(m => m + result.moneyReward!);
    if (isSuccess && result.itemReward) {
      setInventory(prev => [...prev, result.itemReward!]);
    }

    if (isSuccess) setScore(s => s + 25);

    setLogs(prev => [`[Lvl ${level}] ${result.text}`, ...prev]);

    if (suspicion + result.suspicionChange >= 100) {
         setGameState('gameover');
         return;
    }

    setLevelMap(prev => {
        if (!prev) return prev;
        return {
            ...prev,
            entities: prev.entities.map(e => e.id === activeEntity.id ? { ...e, resolved: true } : e)
        };
    });
    
    setActiveEntity(null);
  };

  const restart = () => setGameState('menu');

  // --- Views --- //
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans flex flex-col overflow-hidden relative border-4 border-neutral-900 shadow-2xl">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
        
        <header className="h-16 bg-neutral-900/80 border-b border-white/10 flex items-center justify-between px-6 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl uppercase tracking-widest text-neutral-100 font-bold flex items-center gap-2">
              Jailbreak<span className="text-red-500">: Code 30</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 uppercase">
             Status: Awaiting Initialization
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col xl:flex-row items-start justify-center gap-8 relative z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800/10 to-transparent">
          <div className="w-full max-w-xl">
            <div className="mb-12 bg-neutral-900/80 border border-white/10 p-6 rounded-lg shadow-2xl backdrop-blur-sm relative overflow-hidden">
               {/* Decorative Corners */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-blue-500/40"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-blue-500/40"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-blue-500/40"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-blue-500/40"></div>
              
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">System Directive</h2>
              <p className="text-sm text-neutral-300 leading-relaxed font-mono">
                &gt; 30 levels of security. Sneak, fight, and bribe your way to freedom.<br/>
                &gt; Keep your suspicion low, or risk permanent lockdown.<br/>
                &gt; Select an operative to bypass the perimeter.
              </p>
            </div>
          </div>

          <div className="w-full max-w-3xl">
            <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Select Operative</h2>
              <span className="text-[10px] font-mono text-neutral-500">
                Highest Global Rank: <span className="font-bold text-yellow-500 text-sm shadow-[0_0_10px_rgba(234,179,8,0.2)]">{highestRank}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CHARACTERS.map(char => {
                const isLocked = char.unlockRequirement === 'S_RANK' && highestRank !== 'S';
                const Icon = ICONS[char.iconName] || UserX;
                const isSelected = selectedCharId === char.id;

                return (
                  <div key={char.id} className="flex flex-col gap-2">
                    <button
                      disabled={isLocked}
                      onClick={() => {
                        setSelectedCharId(char.id);
                        setSelectedSkinIndex(0);
                      }}
                      className={`relative p-4 rounded bg-neutral-900/50 border text-left transition-all duration-300 group flex gap-4
                        ${isLocked 
                          ? 'border-white/5 opacity-50 cursor-not-allowed' 
                          : isSelected
                            ? 'border-blue-500 bg-neutral-800 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                            : 'border-white/10 hover:border-blue-500/50 hover:bg-neutral-800 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] cursor-pointer'} 
                      `}
                    >
                      <div className="shrink-0 flex flex-col items-center gap-2">
                        <div className={`w-16 h-16 rounded border flex items-center justify-center
                          ${isLocked 
                            ? 'bg-neutral-800 border-white/5 text-neutral-600' 
                            : isSelected 
                              ? 'bg-neutral-800 border-blue-500/50 text-blue-400'
                              : 'bg-neutral-800 border-white/10 text-neutral-300 group-hover:text-blue-400 group-hover:border-blue-500/50'}`}>
                          <Icon strokeWidth={1.5} className="w-8 h-8" />
                        </div>
                        {isLocked && <Lock className="w-4 h-4 text-red-500/50" />}
                      </div>
                      
                      <div className="flex-1 flex flex-col">
                         <h3 className="text-sm font-bold text-white uppercase tracking-wider">{char.name}</h3>
                         <p className="text-[10px] text-neutral-400 mt-1 leading-tight flex-1">{char.description}</p>
                         
                         {!isLocked && (
                           <div className="mt-2 space-y-1.5">
                             <div className="flex text-[9px] uppercase border-b border-white/5 pb-1">
                               <span className="text-neutral-500 w-12">Perk</span>
                               <span className="text-green-400 leading-tight flex-1">{char.perk}</span>
                             </div>
                             <div className="grid grid-cols-4 gap-1 pt-1">
                               <div className="text-center bg-neutral-950 rounded border border-white/5 py-0.5"><span className="block text-[8px] text-blue-400 uppercase">Stl</span><span className="text-[10px] text-white font-mono">{char.stats.stealth}</span></div>
                               <div className="text-center bg-neutral-950 rounded border border-white/5 py-0.5"><span className="block text-[8px] text-red-400 uppercase">Str</span><span className="text-[10px] text-white font-mono">{char.stats.strength}</span></div>
                               <div className="text-center bg-neutral-950 rounded border border-white/5 py-0.5"><span className="block text-[8px] text-yellow-400 uppercase">Int</span><span className="text-[10px] text-white font-mono">{char.stats.intelligence}</span></div>
                               <div className="text-center bg-neutral-950 rounded border border-white/5 py-0.5"><span className="block text-[8px] text-purple-400 uppercase">Inf</span><span className="text-[10px] text-white font-mono">{char.stats.influence}</span></div>
                             </div>
                           </div>
                         )}
                         {isLocked && (
                           <div className="text-[10px] text-red-500/80 font-bold mt-2 uppercase tracking-widest bg-red-500/10 inline-block px-2 py-0.5 rounded text-center">
                             Rank S Required
                           </div>
                         )}
                      </div>
                    </button>
                    {isSelected && !isLocked && (
                      <div className="flex flex-col gap-2 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="flex gap-2">
                           {char.skins.map((skin, idx) => (
                             <button 
                               key={skin.name}
                               onClick={() => setSelectedSkinIndex(idx)}
                               className={`flex-1 p-2 border text-[9px] uppercase text-center rounded transition-all
                                ${selectedSkinIndex === idx 
                                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                  : 'border-white/10 text-neutral-400 hover:border-white/30 bg-neutral-900/50'}`}
                             >
                               {skin.name}
                             </button>
                           ))}
                        </div>
                        <button
                          onClick={() => startGame(char, selectedSkinIndex)}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white uppercase text-xs font-bold py-3 rounded tracking-widest transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]"
                        >
                          Commence Escape
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <footer className="h-8 bg-black border-t border-white/10 flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex gap-4">
            <span className="text-[9px] text-neutral-600 font-mono">CONNECTION: IDLE</span>
          </div>
          <div className="flex gap-4">
            <span className="text-[9px] text-neutral-400 font-mono uppercase">Build v0.4.12-alpha</span>
          </div>
        </footer>
      </div>
    );
  }

  if (gameState === 'gameover' || gameState === 'victory') {
    const isVictory = gameState === 'victory';
    const rank = calculateRank(score);
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans flex flex-col overflow-hidden relative border-4 border-neutral-900 shadow-2xl items-center justify-center p-6">
         <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
        
         <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`max-w-md w-full p-8 rounded bg-neutral-900/80 border backdrop-blur-sm z-10 relative overflow-hidden shadow-2xl ${isVictory ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]'}`}
         >
           <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 ${isVictory ? 'border-blue-500/50' : 'border-red-500/50'}`}></div>
           <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 ${isVictory ? 'border-blue-500/50' : 'border-red-500/50'}`}></div>
           <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 ${isVictory ? 'border-blue-500/50' : 'border-red-500/50'}`}></div>
           <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 ${isVictory ? 'border-blue-500/50' : 'border-red-500/50'}`}></div>

           <h1 className={`text-4xl font-black uppercase tracking-widest mb-4 flex items-center justify-center gap-2 ${isVictory ? 'text-blue-500' : 'text-red-500'}`}>
             {isVictory ? 'Objective Complete' : 'Mission Failed'}
           </h1>
           <p className="text-neutral-400 mb-8 text-xs font-mono text-center leading-relaxed">
             {isVictory 
               ? "> Perimeter breached. Subject has successfully vanished from tracking sensors." 
               : "> Subject compromised. Apprehended and returned to solitary confinement."}
           </p>

           <div className="space-y-4 mb-8 text-left bg-black/50 p-6 rounded border border-white/5 font-mono text-xs">
             <div className="flex justify-between border-b border-white/5 pb-2">
               <span className="text-neutral-500 uppercase">Sectors Cleared</span>
               <span className="text-white font-bold">{level} / 30</span>
             </div>
             <div className="flex justify-between border-b border-white/5 pb-2">
               <span className="text-neutral-500 uppercase">Final Suspicion</span>
               <span className="text-white font-bold">{suspicion}%</span>
             </div>
             <div className="flex justify-between">
               <span className="text-neutral-500 uppercase">Retrievable Funds</span>
               <span className="text-yellow-500 font-bold">${money}</span>
             </div>
             <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-center">
               <span className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Evaluation Rank</span>
               <span className={`text-3xl font-black shadow-sm ${rank === 'S' ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-neutral-100'}`}>{rank}</span>
             </div>
           </div>

           <button 
             onClick={restart}
             className="w-full py-3 rounded bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-white text-[10px] uppercase tracking-widest font-bold transition flex items-center justify-center gap-2"
           >
             <RefreshCcw className="w-4 h-4" />
             Reinitialize Protocol
           </button>
         </motion.div>
      </div>
    );
  }

  // --- Playing View --- //
  const currentZone = ZONES[Math.min(4, Math.floor((level - 1) / 6))];
  const ActiveCharIcon = playerSkin?.iconName ? ICONS[playerSkin.iconName] || User : character ? (ICONS[character.iconName] || UserX) : UserX;
  const EncounterIcon = activeEntity?.encounterData ? (ICONS[activeEntity.encounterData.iconName] || AlertTriangle) : AlertTriangle;
  const EntityIconMap: Record<string, any> = {
      guard: ShieldAlert,
      door: Lock,
      camera: Cctv,
      stash: PackageOpen,
      inmate: Users,
      exit: LogOut
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-sans flex flex-col overflow-hidden relative border-4 border-neutral-900 shadow-2xl">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
      
      {/* Top Navigation & Global HUD */}
      <header className="h-16 bg-neutral-900/80 border-b border-white/10 flex items-center justify-between px-6 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-600/20 border border-red-500 rounded flex items-center justify-center text-red-500 font-bold shadow-[0_0_10px_rgba(239,68,68,0.4)] font-mono">
            {level}
          </div>
          <div>
            <h1 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Facility Area</h1>
            <p className="text-sm font-mono text-white">{currentZone.name}</p>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-[10px] uppercase text-neutral-500">Score Tracker</span>
            <span className="text-sm text-yellow-500 font-bold font-mono">PT: {score}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-neutral-500">Escape Progress</span>
            <div className="w-48 h-1.5 bg-neutral-800 rounded-full mt-1 overflow-hidden border border-white/5">
              <div className="bg-blue-500 h-full shadow-[0_0_8px_#3b82f6] transition-all duration-500" style={{ width: `${(level / 30) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game View */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* Sidebar Left: Stats & Character */}
        <aside className="w-64 bg-neutral-900/50 border-r border-white/5 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-6 flex flex-col items-center border-b border-white/5 relative">
            <div className="absolute inset-0 opacity-10 blur-xl pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at top, white, transparent)` }}></div>
            <div className="w-32 h-32 bg-neutral-800 rounded-lg border border-white/10 relative overflow-hidden shadow-inner group flex items-center justify-center">
              <div className={`absolute inset-0 opacity-30 ${playerSkin?.colorClass || 'bg-blue-500'}`}></div>
              <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center ${playerSkin?.colorClass || 'bg-blue-500 shadow-[0_0_15px_#3b82f6]'}`}>
                 <ActiveCharIcon size={32} strokeWidth={1.5} className="text-white mix-blend-overlay opacity-90" />
              </div>
              <div className="absolute bottom-0 w-full h-8 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold tracking-tighter text-white uppercase">{character?.name}</span>
                <span className="text-[7px] text-neutral-400 uppercase tracking-widest">{playerSkin?.name}</span>
              </div>
            </div>
            <div className="mt-4 w-full">
              <div className="p-2 bg-neutral-800/50 rounded border border-white/5 text-center">
                <p className="text-[9px] uppercase text-neutral-500 mb-0.5">Primary Perk</p>
                <p className="text-[10px] text-green-400 leading-tight">{character?.perk}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-blue-400">Stealth</span><span className="font-mono">{character?.stats.stealth}/10</span></div>
              <div className="w-full h-1 bg-neutral-800 rounded-full"><div className="h-full bg-blue-500" style={{ width: `${(character?.stats.stealth || 0) * 10}%` }}></div></div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-red-400">Strength</span><span className="font-mono">{character?.stats.strength}/10</span></div>
              <div className="w-full h-1 bg-neutral-800 rounded-full"><div className="h-full bg-red-500" style={{ width: `${(character?.stats.strength || 0) * 10}%` }}></div></div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-yellow-400">Intelligence</span><span className="font-mono">{character?.stats.intelligence}/10</span></div>
              <div className="w-full h-1 bg-neutral-800 rounded-full"><div className="h-full bg-yellow-500" style={{ width: `${(character?.stats.intelligence || 0) * 10}%` }}></div></div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-purple-400">Influence</span><span className="font-mono">{character?.stats.influence}/10</span></div>
              <div className="w-full h-1 bg-neutral-800 rounded-full"><div className="h-full bg-purple-500" style={{ width: `${(character?.stats.influence || 0) * 10}%` }}></div></div>
            </div>
          </div>

          <div className="p-6 border-t border-white/5 mt-auto">
            <div className="space-y-1">
               <div className="flex justify-between text-[10px] font-bold uppercase">
                 <span className={suspicion > 80 ? 'text-red-500' : 'text-neutral-400'}>Suspicion</span>
                 <span className={suspicion > 80 ? 'text-red-500' : 'text-white'}>{suspicion}%</span>
               </div>
               <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                 <div className={`h-full transition-all duration-300 ${suspicion > 80 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : suspicion > 50 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, Math.max(0, suspicion))}%` }}></div>
               </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-900/10 border-t border-yellow-500/20 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-yellow-500 font-bold uppercase tracking-widest text-[10px]">CASH IN HAND</span>
              <span className="text-sm text-white font-mono">${money}</span>
            </div>
          </div>
        </aside>

        {/* Central Viewport */}
        <main className="flex-1 relative flex flex-col min-w-0">
          
          {/* Main Action Feed / Grid Map */}
          <div className="flex-1 p-4 sm:p-8 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800/20 to-transparent overflow-y-hidden">
             
             {levelMap && (
               <div className="relative w-full max-w-4xl border border-white/10 rounded-xl overflow-hidden bg-black shadow-2xl flex items-center justify-center" style={{ aspectRatio: `${levelMap.width}/${levelMap.height}` }}>
                 
                 <div className="absolute top-2 left-4 flex items-center gap-2 z-20 pointer-events-none">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]"></div>
                   <span className="text-[10px] text-red-500 font-mono font-bold uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded">Tactical Movement - Floor {level.toString().padStart(2, '0')}</span>
                 </div>

                 {/* The 3D Map */}
                 <div className="w-full h-full relative overflow-hidden">
                    <Map3D levelMap={levelMap} playerPos={playerPos} playerSkin={playerSkin} />
                 </div>

                 {/* Interaction Overlay (Modal) */}
                 <AnimatePresence>
                     {activeEntity && activeEntity.encounterData && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30 p-8"
                        >
                          <div className="w-full max-w-lg bg-neutral-900 border border-white/20 p-6 rounded-lg shadow-2xl">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 bg-neutral-800 rounded border border-white/10 flex items-center justify-center shrink-0">
                                <EncounterIcon className="w-6 h-6 text-neutral-400" strokeWidth={1.5} />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{activeEntity.encounterData.title}</h3>
                                <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">&quot;{activeEntity.encounterData.description}&quot;</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                              {activeEntity.encounterData.actions.map((action, idx) => {
                                const isBribe = action.cost !== undefined;
                                const disabled = isBribe && (action.cost! > money);
                                const colors = { stealth: 'text-blue-500', strength: 'text-red-500', intelligence: 'text-yellow-500', influence: 'text-purple-500', none: 'text-green-500' };
                                const statColor = colors[action.stat] || 'text-white';

                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleAction(action)}
                                    disabled={disabled}
                                    className={`flex flex-col items-start p-3 rounded border transition-all text-left w-full
                                      ${disabled ? 'bg-neutral-800 border-white/5 opacity-50 cursor-not-allowed' : 'bg-neutral-800 border-white/10 hover:bg-neutral-700 hover:border-white/30 cursor-pointer'}
                                    `}
                                  >
                                    <span className={`text-[9px] uppercase font-bold tracking-wider ${statColor}`}>
                                      {action.stat !== 'none' ? action.stat : isBribe ? 'Bribe' : 'Action'}
                                    </span>
                                    <span className="text-[11px] text-white mt-1">{action.label}</span>
                                    {action.stat !== 'none' && <span className="text-[9px] text-neutral-500 font-mono mt-1 w-full text-right block">DC: {action.dc}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                     )}
                 </AnimatePresence>

                 {/* UI Decorative Corners */}
                 <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500/40 pointer-events-none z-20"></div>
                 <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500/40 pointer-events-none z-20"></div>
                 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500/40 pointer-events-none z-20"></div>
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500/40 pointer-events-none z-20"></div>
               </div>
             )}
          </div>

          {/* Action Log Footer */}
          <div className="h-28 bg-neutral-900/80 border-t border-white/5 p-4 flex gap-4 shrink-0 relative overflow-hidden">
             <div className="flex-1 font-mono text-[10px] space-y-1 text-neutral-500 overflow-y-auto flex flex-col justify-end min-h-0 pl-1">
               <AnimatePresence>
                 {[...logs].reverse().slice(0, 5).map((log, i, arr) => (
                   <motion.p 
                      key={arr.length - i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${i === arr.length - 1 ? 'text-white font-bold' : ''}`}
                   >
                     &gt; {log}
                   </motion.p>
                 ))}
               </AnimatePresence>
             </div>
             
             {/* Sub-status Indicator */}
             <div className="w-1/3 flex items-end justify-end shrink-0 hidden md:flex">
               <div className={`px-4 py-2 border rounded text-[10px] font-bold tracking-widest uppercase shadow-inner
                 ${suspicion > 80 ? 'bg-red-600/20 border-red-500/50 text-red-500' : 'bg-blue-600/20 border-blue-500/50 text-blue-400'}
               `}>
                 {suspicion > 80 ? 'HIGH ALERT' : 'UNDETECTED'}
               </div>
             </div>
          </div>
        </main>

        {/* Inventory Right Panel */}
        <aside className="w-72 bg-neutral-900/50 border-l border-white/5 flex flex-col shrink-0 hidden lg:flex">
          <div className="p-4 border-b border-white/5 shrink-0">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Inventory ({inventory.length}/8)</h2>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 auto-rows-max">
              {Array.from({ length: 8 }).map((_, i) => {
                const item = inventory[i];
                if (item) {
                  const isStealth = item.bonusStat === 'stealth';
                  const isStrength = item.bonusStat === 'strength';
                  const isIntel = item.bonusStat === 'intelligence';
                  const isInfl = item.bonusStat === 'influence';
                  
                  let bgClass = "bg-neutral-700/50";
                  if (isStealth) bgClass = "bg-blue-400/20";
                  if (isStrength) bgClass = "bg-red-400/20";
                  if (isIntel) bgClass = "bg-yellow-400/20";
                  if (isInfl) bgClass = "bg-purple-400/20";

                  return (
                    <div key={i} className="aspect-square bg-neutral-800/50 border border-white/10 rounded flex flex-col items-center justify-center p-2 group hover:border-blue-500/50 cursor-default relative">
                      <div className={`w-full h-full ${bgClass} rounded-sm shadow-inner flex items-center justify-center border border-white/5`}>
                         <PackageOpen className="w-6 h-6 text-white/50" />
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={i} className="aspect-square bg-neutral-900 border border-white/5 rounded flex items-center justify-center"></div>
                  );
                }
              })}
            </div>
          </div>
          
          {/* Detailed Description Panel */}
          <div className="p-4 bg-black/40 border-t border-white/5 shrink-0 h-40">
            <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Recent Acquisition</h3>
            {inventory.length > 0 ? (
              <div className="mt-2 text-left">
                <p className="text-[10px] font-bold text-blue-400 uppercase leading-none">{inventory[inventory.length - 1].name}</p>
                <div className="text-[9px] uppercase text-green-500 mt-1 font-mono">+{inventory[inventory.length -1].bonusAmount} {inventory[inventory.length -1].bonusStat}</div>
                <p className="text-[10px] leading-relaxed text-neutral-400 mt-2">
                  {inventory[inventory.length - 1].description}
                </p>
              </div>
            ) : (
              <p className="text-[10px] leading-relaxed text-neutral-600 mt-2 font-mono">No items acquired.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-8 bg-black border-t border-white/10 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex gap-4">
          <span className="text-[9px] text-green-500 font-mono tracking-widest uppercase">STABLE CONNECTION</span>
          <span className="text-[9px] text-neutral-600 font-mono">LATENCY: {Math.floor(Math.random() * 20 + 5)}ms</span>
        </div>
        <div className="flex gap-4">
          <span className="text-[9px] text-neutral-400 font-mono uppercase tracking-widest">Build v0.4.12-alpha</span>
        </div>
      </footer>
    </div>
  );
}

