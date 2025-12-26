import { Result, err, ok } from "neverthrow";
import { GameRoom } from "./game-room.js";
import type { QuestionForClient, User } from "./types.js";
import { MAX_PLAYERS, POINTS_PER_CORRECT } from "./types.js";
import { generateRoomCode } from "./utils.js";

type GameManagerActionResult<T> = Result<T, string>;

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();

  constructor() {}

  createRoom(creatorId: string): GameManagerActionResult<GameRoom> {
    try {
      const codeResult = this.generateGameRoomCode();
      if (codeResult.isErr()) {
        return err(codeResult.error);
      }

      const existingRoomResult = this.getRoom(codeResult.value);
      if (existingRoomResult.isOk()) {
        return err("Room already exists");
      }

      const room = new GameRoom({
        code: codeResult.value,
        creatorId,
      });

      this.saveRoom(room);
      return ok(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return err(message);
    }
  }

  getRoom(code: string): GameManagerActionResult<GameRoom> {
    const room = this.rooms.get(code);
    if (!room) return err("Room not found");
    return ok(room);
  }

  saveRoom(room: GameRoom): GameManagerActionResult<void> {
    this.rooms.set(room.code, room);
    return ok(undefined);
  }

  deleteRoom(code: string): GameManagerActionResult<void> {
    this.rooms.delete(code);
    return ok(undefined);
  }

  joinRoom(code: string, user: User): GameManagerActionResult<GameRoom> {
    try {
      const roomResult = this.getRoom(code);
      if (roomResult.isErr()) {
        return err("Room not found");
      }

      const room = roomResult.value;

      if (room.status !== "waiting") {
        return err("Game has already started");
      }

      if (room.players.length >= MAX_PLAYERS) {
        return err("Room is full");
      }

      const existingPlayer = room.getPlayer(user.playerId);

      if (existingPlayer) {
        existingPlayer.isConnected = true;
        existingPlayer.username = user.username;
        existingPlayer.profilePicture = user.profilePicture;
        this.saveRoom(room);
        return ok(room);
      }

      room.addPlayer(user);
      this.saveRoom(room);
      return ok(room);
    } catch (error) {
      console.error(error);
      return err("Unknown error");
    }
  }

  rejoinRoom(
    code: string,
    playerId: string
  ): GameManagerActionResult<GameRoom> {
    const roomResult = this.getRoom(code);
    if (roomResult.isErr()) return err("Room not found");

    const room = roomResult.value;
    const player = room.getPlayer(playerId);
    if (!player) return err("Player not found");

    player.isConnected = true;
    this.saveRoom(room);
    return ok(room);
  }

  leaveRoom(
    code: string,
    playerId: string
  ): GameManagerActionResult<GameRoom | null> {
    const roomResult = this.getRoom(code);
    if (roomResult.isErr()) return err("Room not found");

    const room = roomResult.value;
    const player = room.getPlayer(playerId);
    if (!player) return err("Player not found");

    if (room.status === "waiting") {
      room.removePlayer(playerId);
      if (room.players.length === 0) {
        this.deleteRoom(code);
        return ok(null);
      }

      // Transfer creator if needed
      if (playerId === room.creatorId && room.players.length > 0) {
        room.creatorId = room.players[0].id;
      }
    } else {
      room.disconnectPlayer(playerId);
    }

    this.saveRoom(room);
    return ok(room);
  }

  startGame(
    code: string,
    config: { gameId: string; timerDuration: number }
  ): GameManagerActionResult<GameRoom> {
    const roomResult = this.getRoom(code);
    if (roomResult.isErr()) {
      return err("Room not found");
    }

    const room = roomResult.value;

    if (room.status !== "waiting") {
      return err("Game has already started");
    }

    room.startGame(config);

    const questionResult = this.generateQuestion(room);
    if (questionResult.isErr()) {
      return err(questionResult.error);
    }

    const question = questionResult.value;
    room.currentQuestion = question;

    // Reset all players' answered status
    room.players.forEach((p) => {
      p.hasAnswered = false;
    });

    this.saveRoom(room);
    return ok(room);
  }

  private generateQuestion(
    room: GameRoom
  ): GameManagerActionResult<QuestionForClient> {
    if (!room.game) {
      return err("Game not loaded");
    }

    const question = room.game.questions[room.currentQuestionIndex];
    if (!question) {
      return err("No more questions available");
    }

    let options: QuestionForClient["options"] = [];

    if (room.game.type === "multiple-choice") {
      // Generate 3 wrong options
      const wrongAnswers = room.game.questions
        .filter((q) => q.answer !== question.answer)
        .map((q) => ({ id: q.id.toString(), text: q.answer }))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      options = [
        ...wrongAnswers,
        { id: question.id.toString(), text: question.answer },
      ].sort(() => Math.random() - 0.5);
    } else if (room.game.type === "autocomplete") {
      options = room.game.options || [];
    } else {
      options = [];
    }

    return ok({
      id: question.id,
      question: question.question,
      type: question.type,
      options,
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.game.questions.length,
    });
  }

  submitAnswer(
    code: string,
    playerId: string,
    answer: string
  ): GameManagerActionResult<{ isCorrect: boolean; room: GameRoom }> {
    const roomResult = this.getRoom(code);
    if (roomResult.isErr()) {
      return err("Room not found");
    }

    const room = roomResult.value;

    if (room.status !== "playing" || !room.currentQuestion) {
      return err("No active question");
    }

    const player = room.getPlayer(playerId);
    if (!player) {
      return err("Player not found");
    }

    if (player.hasAnswered) {
      return err("Already answered");
    }

    const originalQuestion = room.game?.questions.find(
      (q) => q.id === room.currentQuestion?.id
    );

    const isCorrect = originalQuestion?.answer === answer;

    if (isCorrect) {
      player.score += POINTS_PER_CORRECT;
    }

    player.hasAnswered = true;
    this.saveRoom(room);

    return ok({ isCorrect, room });
  }

  nextQuestion(code: string): GameManagerActionResult<{
    room: GameRoom;
    question: QuestionForClient | null;
    isGameOver: boolean;
  }> {
    const roomResult = this.getRoom(code);
    if (roomResult.isErr()) {
      return err("Room not found");
    }

    const room = roomResult.value;
    room.currentQuestionIndex++;

    if (!room.game) {
      return err("Game not loaded");
    }

    if (room.currentQuestionIndex >= room.game.questions.length) {
      room.status = "finished";
      room.currentQuestion = null;

      this.saveRoom(room);
      return ok({ room, question: null, isGameOver: true });
    }

    // Reset answered status
    room.players.forEach((p) => {
      p.hasAnswered = false;
    });

    const questionResult = this.generateQuestion(room);
    if (questionResult.isErr()) {
      room.status = "finished";
      room.currentQuestion = null;
      this.saveRoom(room);
      return ok({ room, question: null, isGameOver: true });
    }

    const question = questionResult.value;
    room.currentQuestion = question;
    this.saveRoom(room);
    return ok({ room, question, isGameOver: false });
  }

  getCorrectAnswer(
    code: string,
    questionId: number
  ): GameManagerActionResult<string | null> {
    const roomResult = this.getRoom(code);
    if (roomResult.isErr()) {
      return err("Room not found");
    }

    const room = roomResult.value;
    const question = room.game?.questions.find((q) => q.id === questionId);
    return ok(question?.answer ?? null);
  }

  close(): GameManagerActionResult<void> {
    this.rooms.clear();
    return ok(undefined);
  }

  private generateGameRoomCode(): GameManagerActionResult<string> {
    let code: string;
    let attempts = 0;

    do {
      code = generateRoomCode();
      const existingResult = this.getRoom(code);
      if (existingResult.isErr()) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return err("Could not generate room code");
    }
    return ok(code);
  }
}
