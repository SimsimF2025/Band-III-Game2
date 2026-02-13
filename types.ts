
export interface VocabItem {
  id: string;
  entry: string;
  pos: string;
  meaningArabic: string;
  meaningEnglish: string;
  family?: string;
}

export enum GameList {
  ListA = 'List A',
  ListB = 'List B',
  ListC = 'List C',
  ListD = 'List D'
}

export enum GameMode {
  EnglishToArabic = 'English-Arabic',
  EnglishToDefinition = 'English-Definition'
}

export enum Difficulty {
  Easy = 'Easy (10 words)',
  Medium = 'Medium (15 words)',
  Hard = 'Hard (20 words)'
}

export interface CardData {
  uniqueId: string;
  vocabId: string;
  content: string;
  isArabic?: boolean;
  type: 'term' | 'match';
}

export interface GameState {
  studentName: string;
  studentClass: string;
  score: number;
  timer: number;
  isGameStarted: boolean;
  isGameOver: boolean;
  matchedPairs: string[];
  selectedList: GameList;
  mode: GameMode;
  difficulty: Difficulty;
}
