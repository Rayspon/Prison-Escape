import { Character, Zone, Encounter, Item, LevelMap, Entity } from './types';

export const CHARACTERS: Character[] = [
  {
    id: 'ghost',
    name: 'The Ghost',
    description: 'A master of shadows with a fragile frame.',
    perk: '+3 bonus to all Stealth checks implicitly represented in high base stat.',
    stats: { stealth: 9, strength: 2, intelligence: 5, influence: 4 },
    startingMoney: 10,
    iconName: 'UserX',
    skins: [
      { name: 'Standard Issue', colorClass: 'bg-blue-500 shadow-[0_0_15px_#3b82f6]', iconName: 'User' },
      { name: 'Pitch Black', colorClass: 'bg-stone-900 shadow-[0_0_15px_#1c1917]', iconName: 'Ghost' },
      { name: 'Neon Visor', colorClass: 'bg-cyan-400 shadow-[0_0_15px_#22d3ee]', iconName: 'Bot' }
    ]
  },
  {
    id: 'brawler',
    name: 'The Brawler',
    description: 'Brute force is the only language they speak.',
    perk: 'Can force through physical obstacles easily.',
    stats: { stealth: 2, strength: 9, intelligence: 3, influence: 6 },
    startingMoney: 5,
    iconName: 'UserRoundX',
    skins: [
      { name: 'Orange Jumpsuit', colorClass: 'bg-orange-500 shadow-[0_0_15px_#f97316]', iconName: 'UserRound' },
      { name: 'Riot Gear', colorClass: 'bg-slate-700 shadow-[0_0_15px_#334155]', iconName: 'HardHat' }
    ]
  },
  {
    id: 'mastermind',
    name: 'The Mastermind',
    description: 'Calculates every variable. Hacks systems effortlessly.',
    perk: 'Excels at bypassing electronic security.',
    stats: { stealth: 5, strength: 2, intelligence: 9, influence: 4 },
    startingMoney: 20,
    iconName: 'Brain',
    skins: [
      { name: 'Lab Coat', colorClass: 'bg-white shadow-[0_0_15px_#ffffff]', iconName: 'User' },
      { name: 'Cypher Punk', colorClass: 'bg-purple-500 shadow-[0_0_15px_#a855f7]', iconName: 'VenetianMask' }
    ]
  },
  {
    id: 'insider',
    name: 'The Insider',
    description: 'Connections run deeper than the prison walls.',
    perk: 'Starts with deep pockets and extreme influence over others.',
    stats: { stealth: 4, strength: 3, intelligence: 4, influence: 9 },
    startingMoney: 50,
    iconName: 'Briefcase',
    skins: [
      { name: 'Tailored Suit', colorClass: 'bg-indigo-600 shadow-[0_0_15px_#4f46e5]', iconName: 'Briefcase' },
      { name: 'Smuggler', colorClass: 'bg-amber-600 shadow-[0_0_15px_#d97706]', iconName: 'User' }
    ]
  },
  {
    id: 'phantom',
    name: 'The Phantom',
    description: 'A legend among inmates. Almost mythological.',
    perk: 'High stats across the board.',
    stats: { stealth: 8, strength: 8, intelligence: 8, influence: 8 },
    startingMoney: 40,
    iconName: 'Crown',
    unlockRequirement: 'S_RANK',
    skins: [
      { name: 'Wraith', colorClass: 'bg-fuchsia-400 shadow-[0_0_15px_#e879f9]', iconName: 'Ghost' },
      { name: 'Blood Moon', colorClass: 'bg-red-600 shadow-[0_0_15px_#dc2626]', iconName: 'Skull' }
    ]
  }
];

export const ZONES: Zone[] = [
  { name: 'Cell Block C', baseDc: 12, description: 'The lowest security tier. Mostly just grimy bars and bored guards.' },
  { name: 'The Stacks', baseDc: 15, description: 'Maintenance corridors and laundry rooms. Easy to get lost, but heavily patrolled.' },
  { name: 'Maximum Security', baseDc: 18, description: 'Electronic doors, hardened veterans, and active camera systems.' },
  { name: 'The Yard', baseDc: 21, description: 'Open space. Nowhere to hide. Sniper towers are active.' },
  { name: 'Perimeter Wall', baseDc: 24, description: 'The final hurdle. Heavily armed guards and blast doors.' }
];

export const ITEMS: Item[] = [
  { id: 'shiv', name: 'Makeshift Shiv', description: '+2 Strength', bonusStat: 'strength', bonusAmount: 2 },
  { id: 'lockpick', name: 'Bent Wire', description: '+2 Stealth', bonusStat: 'stealth', bonusAmount: 2 },
  { id: 'keycard', name: 'Guard Keycard', description: '+3 Intelligence (bypassing doors)', bonusStat: 'intelligence', bonusAmount: 3 },
  { id: 'cigs', name: 'Carton of Smokes', description: '+3 Influence', bonusStat: 'influence', bonusAmount: 3 }
];

// Helper to generate a dynamic encounter based on the current level/zone
export function generateEncounter(level: number, forcedType?: string): Encounter {
  const zoneIndex = Math.min(4, Math.floor((level - 1) / 6));
  const zone = ZONES[zoneIndex];
  const dc = zone.baseDc + Math.floor(Math.random() * 3); // some variance

  const encounterTypes = ['guard', 'door', 'camera', 'inmate', 'stash'];
  // Weight encounters by zone slightly, but random is fine for this scale
  let type = forcedType || encounterTypes[Math.floor(Math.random() * encounterTypes.length)];
  
  // Exclude cameras in low security
  if (type === 'camera' && zoneIndex === 0) type = 'door';

  switch (type) {
    case 'guard':
      return {
        id: `guard-${level}`,
        title: 'Patrolling Guard',
        description: 'A guard blocks the hallway, casually twirling a baton.',
        type: 'guard',
        iconName: 'ShieldAlert',
        actions: [
          {
            label: 'Sneak Past', stat: 'stealth', dc,
            onSuccess: { text: 'You slip entirely unnoticed into the shadows.', suspicionChange: -5 },
            onFailure: { text: 'You kick a can. The guard yells and radios it in.', suspicionChange: 20 }
          },
          {
            label: 'Ambush', stat: 'strength', dc: dc + 2,
            onSuccess: { text: 'You knock them out cold and drag them into a closet.', suspicionChange: 5, moneyReward: 5 },
            onFailure: { text: 'You lose the scuffle and have to flee, making a huge scene.', suspicionChange: 25 }
          },
          {
            label: 'Bribe ($15)', stat: 'none', dc: 0, cost: 15,
            onSuccess: { text: 'The guard pockets the cash and looks the other way.', suspicionChange: -10 },
            onFailure: { text: 'You shouldn\'t see this.', suspicionChange: 0 }
          }
        ]
      };
    case 'door':
      return {
        id: `door-${level}`,
        title: 'Secured Gate',
        description: 'A heavy metal door with a reinforced locking mechanism blocks your path.',
        type: 'door',
        iconName: 'Lock',
        actions: [
          {
            label: 'Pick the Lock', stat: 'stealth', dc,
            onSuccess: { text: 'Click. The lock gives way silently.', suspicionChange: 0 },
            onFailure: { text: 'Your tool snaps, echoing loudly down the hall.', suspicionChange: 15 }
          },
          {
            label: 'Hack the Keypad', stat: 'intelligence', dc: dc - 1,
            onSuccess: { text: 'You rewire the panel. The light goes green.', suspicionChange: 0 },
            onFailure: { text: 'You trigger a local tamper alarm!', suspicionChange: 25 }
          },
          {
            label: 'Force It', stat: 'strength', dc: dc + 3,
            onSuccess: { text: 'The hinges bend and break under your assault.', suspicionChange: 10 },
            onFailure: { text: 'The door holds, but you make a deafening noise.', suspicionChange: 20 }
          }
        ]
      };
    case 'camera':
      return {
        id: `camera-${level}`,
        title: 'Security Camera',
        description: 'An automated security camera sweeps the area rhythmically.',
        type: 'camera',
        iconName: 'Cctv',
        actions: [
          {
            label: 'Time the Blind Spot', stat: 'stealth', dc,
            onSuccess: { text: 'You roll under the camera\'s vision arc flawlessly.', suspicionChange: 0 },
            onFailure: { text: 'The camera catches your shoulder. A warning buzz sounds.', suspicionChange: 15 }
          },
          {
            label: 'Hack the Feed', stat: 'intelligence', dc: dc - 2,
            onSuccess: { text: 'You loop the feed. The camera is blind.', suspicionChange: -10 },
            onFailure: { text: 'You short the circuit, triggering a failsafe alarm!', suspicionChange: 25 }
          }
        ]
      };
    case 'inmate':
      return {
        id: `inmate-${level}`,
        title: 'Suspicious Inmate',
        description: 'Another prisoner spots you in a restricted zone and approaches, looking for trouble or a deal.',
        type: 'inmate',
        iconName: 'Users',
        actions: [
          {
            label: 'Intimidate', stat: 'strength', dc,
            onSuccess: { text: 'They back down and walk away fast.', suspicionChange: 0 },
            onFailure: { text: 'They laugh and shout, alerting a nearby patrol!', suspicionChange: 20 }
          },
          {
            label: 'Fast Talk', stat: 'influence', dc: dc - 2,
            onSuccess: { text: "You convince them you're on a covert errand for the Warden.", suspicionChange: -5 },
            onFailure: { text: "They don't buy it and threaten to snitch.", suspicionChange: 15 }
          },
          {
             label: 'Bribe to keep quiet ($5)', stat: 'none', dc: 0, cost: 5,
             onSuccess: { text: 'They take the money and nod silently.', suspicionChange: -5 },
             onFailure: { text: '', suspicionChange: 0 }
          }
        ]
      };
    case 'stash':
    default:
      // random item roll
      const rewardItem = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      return {
        id: `stash-${level}`,
        title: 'Hidden Stash',
        description: 'You spot a loose vent panel that looks like it\'s been used to hide contraband.',
        type: 'stash',
        iconName: 'PackageOpen',
        actions: [
          {
            label: 'Carefully Search', stat: 'stealth', dc: dc - 2,
            onSuccess: { text: 'You found something useful!', suspicionChange: -5, itemReward: rewardItem },
            onFailure: { text: 'You knock the vent panel to the floor with a crash.', suspicionChange: 15 }
          },
          {
            label: 'Ignore & Move On', stat: 'none', dc: 0,
            onSuccess: { text: 'You decide not to risk the noise.', suspicionChange: -5 },
            onFailure: { text: '', suspicionChange: 0 }
          }
        ]
      };
  }
}

export function generateLevelMap(level: number): LevelMap {
  const width = 31;
  const height = 19;
  const walls = Array(height).fill(null).map(() => Array(width).fill(true));
  
  const rooms: any[] = [];
  const secW = 10;
  const secH = 9;
  
  for (let sy = 0; sy < 2; sy++) {
      for (let sx = 0; sx < 3; sx++) {
          const rw = Math.floor(Math.random() * 3) + 4; // 4 to 6
          const rh = Math.floor(Math.random() * 3) + 4; // 4 to 6
          const rx = (sx * secW) + Math.floor(Math.random() * (secW - rw - 1)) + 1;
          const ry = (sy * secH) + Math.floor(Math.random() * (secH - rh - 1)) + 1;
          
          rooms.push({ rx, ry, rw, rh, cx: Math.floor(rx + rw/2), cy: Math.floor(ry + rh/2) });
          
          for (let y = ry; y < ry + rh; y++) {
              for (let x = rx; x < rx + rw; x++) {
                  walls[y][x] = false;
              }
          }
      }
  }

  const carveCorridor = (r1: any, r2: any) => {
      let x = r1.cx;
      let y = r1.cy;
      if (Math.random() > 0.5) {
          while (x !== r2.cx) { walls[y][x] = false; x += x < r2.cx ? 1 : -1; }
          while (y !== r2.cy) { walls[y][x] = false; y += y < r2.cy ? 1 : -1; }
      } else {
          while (y !== r2.cy) { walls[y][x] = false; y += y < r2.cy ? 1 : -1; }
          while (x !== r2.cx) { walls[y][x] = false; x += x < r2.cx ? 1 : -1; }
      }
  }

  for (let sy = 0; sy < 2; sy++) {
      for (let sx = 0; sx < 3; sx++) {
          const r1 = rooms[sy * 3 + sx];
          if (sx < 2) {
              const r2 = rooms[sy * 3 + sx + 1];
              carveCorridor(r1, r2);
          }
          if (sy < 1) {
              const r2 = rooms[(sy + 1) * 3 + sx];
              carveCorridor(r1, r2);
          }
      }
  }

  const entities: Entity[] = [];
  const addEntity = (type: Entity['type'], ex: number, ey: number) => {
      entities.push({
          id: `${type}-${Math.random()}`,
          x: ex,
          y: ey,
          type,
          resolved: false,
          encounterData: type !== 'exit' ? generateEncounter(level, type) : undefined
      });
  };

  // Exit
  addEntity('exit', rooms[5].cx, rooms[5].cy);

  const getEmptySpot = (excludeRoomStart = false) => {
      let ex, ey;
      let valid = false;
      let attempts = 0;
      while(!valid && attempts < 200) {
          attempts++;
          ex = Math.floor(Math.random() * width);
          ey = Math.floor(Math.random() * height);
          if (walls[ey][ex]) continue;
          if (excludeRoomStart && ex >= rooms[0].rx && ex < rooms[0].rx+rooms[0].rw && ey >= rooms[0].ry && ey < rooms[0].ry+rooms[0].rh) continue;
          if (entities.some(e => e.x === ex && e.y === ey)) continue;
          valid = true;
      }
      return valid ? {x: ex!, y: ey!} : null;
  };

  const numGuards = 4 + Math.floor(level * 0.8);
  for(let i=0; i<numGuards; i++) {
      const spot = getEmptySpot(true);
      if (spot) addEntity('guard', spot.x, spot.y);
  }

  const numDoors = 3 + Math.floor(level / 2);
  for(let i=0; i<numDoors; i++) {
      const spot = getEmptySpot(true);
      if (spot) addEntity('door', spot.x, spot.y);
  }

  const numCams = level > 2 ? Math.floor(level / 1.5) : 0;
  for(let i=0; i<numCams; i++) {
      const spot = getEmptySpot(true);
      if (spot) addEntity('camera', spot.x, spot.y);
  }

  const numStashes = 1 + Math.floor(Math.random() * 3);
  for(let i=0; i<numStashes; i++) {
      const spot = getEmptySpot();
      if (spot) addEntity('stash', spot.x, spot.y);
  }

  if (Math.random() > 0.2) {
      const numInmates = 1 + Math.floor(Math.random() * 2);
      for(let i=0; i<numInmates; i++) {
          const spot = getEmptySpot(true);
          if(spot) addEntity('inmate', spot.x, spot.y);
      }
  }

  return { width, height, walls, entities, startX: rooms[0].cx, startY: rooms[0].cy };
}
