export type Game =
  | {
      id: string;
      title: string;
      image: string;
      type: "multiple-choice";
      questions: Question[];
      options: QuestionForClient["options"];
    }
  | {
      id: string;
      title: string;
      image: string;
      type: "autocomplete";
      questions: Question[];
      placeholder: string;
      options: QuestionForClient["options"];
    };

export type Question = {
  id: number;
  question: string;
  type: string;
  answer: string;
};

export type Player = {
  id: User["playerId"];
  username: User["username"];
  profilePicture: User["profilePicture"];
  mode: User["mode"];
  score: number;
  hasAnswered: boolean;
  isConnected: boolean;
};

export type Viewer = {
  id: string;
  isConnected: boolean;
};

export type QuestionForClient = {
  id: number;
  question: string;
  type: string;
  options: { id: string; label: string }[];
  kidOptions: { id: string; label: string }[];
  placeholder?: string;
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
      mode: "pro" | "kid";
    }
  | {
      type: "joinAsViewer";
      roomCode: string;
      viewerId: string;
    }
  | { type: "rejoin"; roomCode: string; playerId: string }
  | { type: "leave"; roomCode: string; playerId: string }
  | { type: "start"; roomCode: string; gameId: string; timerDuration: number }
  | { type: "answer"; roomCode: string; playerId: string; answer: string }
  | { type: "nextQuestion"; roomCode: string };

export type ServerMessage =
  | { type: "roomState"; room: GameRoomData }
  | { type: "playerJoined"; player: Player }
  | { type: "viewerJoined"; viewer: Viewer }
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
  mode: "pro" | "kid";
};

export type GameRoomData = {
  code: string;
  game: GamePreview | null;
  creatorId: string;
  timerDuration: number;
  players: Player[];
  viewers: Viewer[];
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
