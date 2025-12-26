export type Game = {
  id: string;
  title: string;
  image: string;
  type: "multiple-choice" | "autocomplete";
  questions: Question[];
  options?: { id: string; text: string }[];
};

export type Question = {
  id: number;
  question: string;
  type: string;
  answer: string;
};

export type Player = {
  id: string;
  username: string;
  profilePicture: string;
  score: number;
  hasAnswered: boolean;
  isConnected: boolean;
};

export type QuestionForClient = {
  id: number;
  question: string;
  type: string;
  options: { id: string; text: string }[];
  questionNumber: number;
  totalQuestions: number;
};

// WebSocket message types
export type ClientMessage =
  | {
      type: "join";
      roomCode: string;
      username: string;
      playerId: string;
      profilePicture: string;
    }
  | { type: "rejoin"; roomCode: string; playerId: string }
  | { type: "leave"; roomCode: string; playerId: string }
  | { type: "start"; roomCode: string; gameId: string; timerDuration: number }
  | { type: "answer"; roomCode: string; playerId: string; answer: string }
  | { type: "nextQuestion"; roomCode: string };

export type ServerMessage =
  | { type: "roomState"; room: GameRoomData }
  | { type: "playerJoined"; player: Player }
  | { type: "playerLeft"; playerId: string }
  | { type: "playerReconnected"; playerId: string }
  | { type: "gameStarted"; room: GameRoomData }
  | { type: "timerTick"; timeLeft: number }
  | { type: "playerAnswered"; playerId: string }
  | {
      type: "questionResult";
      correctAnswer: string;
      scores: Record<string, number>;
    }
  | { type: "newQuestion"; question: QuestionForClient }
  | { type: "gameEnded"; finalScores: Player[] }
  | { type: "error"; message: string };

export const MAX_PLAYERS = 10;
export const POINTS_PER_CORRECT = 100;

export type User = {
  playerId: string;
  username: string;
  profilePicture: string;
};

export type GameRoomData = {
  code: string;
  game: GamePreview | null;
  creatorId: string;
  timerDuration: number;
  players: Player[];
  status: "waiting" | "playing" | "finished";
  currentQuestionIndex: number;
  currentQuestion: QuestionForClient | null;
  startedAt: number | null;
};


export type GamePreview = {
  id: string;
  title: string;
  image: string;
  questionsCount: number;
};