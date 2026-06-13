export type Stat = 'stealth' | 'strength' | 'intelligence' | 'influence' | 'none';

export interface Skin {
  name: string;
  colorClass: string;
  iconName: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  perk: string;
  stats: Record<Exclude<Stat, 'none'>, number>;
  startingMoney: number;
  iconName: string; 
  unlockRequirement?: string; // 'S_RANK' etc., if omitted, unlocked by default
  skins: Skin[];
}

export interface Item {
  id: string;
  name: string;
  description: string;
  bonusStat: Stat;
  bonusAmount: number;
}

export interface Action {
  label: string;
  stat: Stat;
  dc: number; // Difficulty Class
  cost?: number; // Only for money
  onSuccess: {
    text: string;
    suspicionChange: number;
    moneyReward?: number;
    itemReward?: Item;
  };
  onFailure: {
    text: string;
    suspicionChange: number;
  };
}

export interface Encounter {
  id: string;
  title: string;
  description: string;
  type: 'guard' | 'door' | 'inmate' | 'camera' | 'stash';
  iconName: string;
  actions: Action[];
}

export interface Zone {
  name: string;
  baseDc: number;
  description: string;
}

export interface Rank {
  letter: string;
  minScore: number;
  description: string;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  type: 'guard' | 'door' | 'inmate' | 'camera' | 'stash' | 'exit';
  encounterData?: Encounter;
  resolved: boolean;
}

export interface LevelMap {
  width: number;
  height: number;
  walls: boolean[][];
  entities: Entity[];
  startX: number;
  startY: number;
}
