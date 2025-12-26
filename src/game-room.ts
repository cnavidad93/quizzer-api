import { loadGame } from "./data/games";
import { Game, GameRoomData, Player, QuestionForClient, User } from "./types";

export class GameRoom {
  code: string;
  game: Game | null = null;
  creatorId: string;
  timerDuration: number;
  players: Player[];
  status: "waiting" | "playing" | "finished";
  currentQuestionIndex: number;
  currentQuestion: QuestionForClient | null;
  startedAt: number | null;

  constructor(options: { code: string; creatorId: string }) {
    this.code = options.code;
    this.creatorId = options.creatorId;
    this.timerDuration = 15;
    this.players = [];
    this.status = "waiting";
    this.currentQuestionIndex = 0;
    this.currentQuestion = null;
    this.startedAt = null;
  }

  addPlayer(user: User) {
    this.players.push({
      id: user.playerId,
      username: user.username,
      profilePicture: user.profilePicture,
      score: 0,
      hasAnswered: false,
      isConnected: true,
    });
  }

  getPlayer(playerId: string): Player | null {
    const player = this.players.find((p) => p.id === playerId);
    return player || null;
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter((p) => p.id !== playerId);
  }

  disconnectPlayer(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.isConnected = false;
    }
  }

  startGame(config: {
    gameId: string;
    timerDuration: number;
  }): void {
    const game = loadGame(config.gameId);
    this.game = game;
    this.status = "playing";
    this.startedAt = Date.now();
    this.currentQuestionIndex = 0;
    this.timerDuration = config.timerDuration;
  }

  toJSON(): GameRoomData {
    return {
      code: this.code,
      game: this.game
        ? {
            id: this.game.id,
            title: this.game.title,
            image: this.game.image,
            questionsCount: this.game.questions.length,
          }
        : null,
      creatorId: this.creatorId,
      timerDuration: this.timerDuration,
      players: this.players,
      status: this.status,
      currentQuestionIndex: this.currentQuestionIndex,
      currentQuestion: this.currentQuestion,
      startedAt: this.startedAt,
    };
  }
}
