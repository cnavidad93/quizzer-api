import type { WSContext } from "hono/ws";
import { GameManager } from "./game-manager.js";
import type { ClientMessage, ServerMessage } from "./types.js";

type WebSocketClient = WSContext;
type RoomConnections = {
  [playerId: string]: WebSocketClient;
};
type ViewerConnections = {
  [viewerId: string]: WebSocketClient;
};

export class WebSocketHandler {
  private gameManager: GameManager;
  private rooms: Map<string, RoomConnections> = new Map();
  private viewers: Map<string, ViewerConnections> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  handleMessage(ws: WebSocketClient, data: string): void {
    let message: ClientMessage;

    try {
      message = JSON.parse(data) as ClientMessage;
    } catch {
      this.send(ws, { type: "error", message: "Invalid message format" });
      return;
    }

    try {
      switch (message.type) {
        case "join":
          this.handleJoin(
            ws,
            message.roomCode,
            message.playerId,
            message.username,
            message.profilePicture,
            message.mode
          );
          break;

        case "joinAsViewer":
          this.handleJoinAsViewer(ws, message.roomCode, message.viewerId);
          break;

        case "rejoin":
          this.handleRejoin(ws, message.roomCode, message.playerId);
          break;

        case "leave":
          this.handleLeave(message.roomCode, message.playerId);
          break;

        case "start":
          this.handleStart(
            message.roomCode,
            message.gameId,
            message.timerDuration
          );
          break;

        case "answer":
          this.handleAnswer(
            ws,
            message.roomCode,
            message.playerId,
            message.answer
          );
          break;

        case "nextQuestion":
          this.handleNextQuestion(message.roomCode);
          break;

        case "newGame":
          this.handleNewGame(message.roomCode);
          break;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.send(ws, { type: "error", message: errorMessage });
    }
  }

  handleDisconnect(roomCode: string, playerId: string): void {
    this.removeConnection(roomCode, playerId);
    this.gameManager.leaveRoom(roomCode, playerId);
    this.broadcast(roomCode, { type: "playerLeft", playerId });
  }

  private send(ws: WebSocketClient, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }

  private broadcast(
    roomCode: string,
    message: ServerMessage,
    excludePlayerId?: string
  ): void {
    const connections = this.rooms.get(roomCode);
    const viewerConnections = this.viewers.get(roomCode);

    const messageStr = JSON.stringify(message);

    // Broadcast to players
    if (connections) {
      for (const [playerId, ws] of Object.entries(connections)) {
        if (playerId !== excludePlayerId) {
          try {
            ws.send(messageStr);
          } catch (error) {
            console.error(`Failed to broadcast to ${playerId}:`, error);
          }
        }
      }
    }

    // Broadcast to viewers
    if (viewerConnections) {
      for (const [viewerId, ws] of Object.entries(viewerConnections)) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error(`Failed to broadcast to viewer ${viewerId}:`, error);
        }
      }
    }
  }

  private addConnection(
    roomCode: string,
    playerId: string,
    ws: WebSocketClient
  ): void {
    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, {});
    }
    this.rooms.get(roomCode)![playerId] = ws;
  }

  private removeConnection(roomCode: string, playerId: string): void {
    const connections = this.rooms.get(roomCode);
    if (connections) {
      delete connections[playerId];
      if (Object.keys(connections).length === 0) {
        this.rooms.delete(roomCode);
        
        const viewerConnections = this.viewers.get(roomCode);
        if (!viewerConnections || Object.keys(viewerConnections).length === 0) {
          this.clearTimer(roomCode);
        }
      }
    }
  }

  private addViewerConnection(
    roomCode: string,
    viewerId: string,
    ws: WebSocketClient
  ): void {
    if (!this.viewers.has(roomCode)) {
      this.viewers.set(roomCode, {});
    }
    this.viewers.get(roomCode)![viewerId] = ws;
  }

  private removeViewerConnection(roomCode: string, viewerId: string): void {
    const connections = this.viewers.get(roomCode);
    if (connections) {
      delete connections[viewerId];
      if (Object.keys(connections).length === 0) {
        this.viewers.delete(roomCode);
      }
    }
  }

  private clearTimer(roomCode: string): void {
    const timer = this.timers.get(roomCode);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(roomCode);
    }
  }

  private startQuestionTimer(roomCode: string, duration: number): void {
    this.clearTimer(roomCode);

    let timeLeft = duration;

    this.broadcast(roomCode, { type: "timerTick", timeLeft });

    const timer = setInterval(async () => {
      timeLeft--;

      this.broadcast(roomCode, { type: "timerTick", timeLeft });

      if (timeLeft <= 0) {
        this.clearTimer(roomCode);
        this.handleTimeUp(roomCode);
      }
    }, 1000);

    this.timers.set(roomCode, timer);
  }

  private handleTimeUp(roomCode: string): void {
    const roomResult = this.gameManager.getRoom(roomCode);
    if (roomResult.isErr()) return;

    const room = roomResult.value;
    if (room.status !== "playing" || !room.currentQuestion) return;

    const correctAnswerResult = this.gameManager.getCorrectAnswer(
      roomCode,
      room.currentQuestion.id
    );

    if (correctAnswerResult.isErr()) return;

    const correctAnswer = correctAnswerResult.value;

    const scores: Record<string, number> = {};
    room.players.forEach((p) => {
      scores[p.id] = p.score;
    });

    this.broadcast(roomCode, {
      type: "questionResult",
      correctAnswer: correctAnswer || "",
      scores,
    });

    // Wait a moment before next question
    setTimeout(() => {
      this.handleNextQuestion(roomCode);
    }, 2000);
  }

  private handleNextQuestion(roomCode: string): void {
    try {
      const resultResult = this.gameManager.nextQuestion(roomCode);
      if (resultResult.isErr()) return;

      const result = resultResult.value;

      if (result.isGameOver) {
        const sortedPlayers = [...result.room.players].sort(
          (a, b) => b.score - a.score
        );
        this.broadcast(roomCode, {
          type: "gameEnded",
          finalScores: sortedPlayers,
        });
        this.clearTimer(roomCode);
      } else if (result.question) {
        this.broadcast(roomCode, {
          type: "newQuestion",
          question: result.question,
        });
        this.startQuestionTimer(roomCode, result.room.timerDuration);
      }
    } catch (error) {
      console.error("Error handling next question:", error);
    }
  }

  private handleJoin(
    ws: WebSocketClient,
    roomCode: string,
    playerId: string,
    username: string,
    profilePicture: string,
    mode: "pro" | "kid"
  ): void {
    const roomResult = this.gameManager.joinRoom(roomCode, {
      playerId,
      username,
      profilePicture,
      mode,
    });

    if (roomResult.isErr()) {
      this.send(ws, { type: "error", message: roomResult.error });
      return;
    }

    const room = roomResult.value;
    this.addConnection(roomCode, playerId, ws);
    this.send(ws, { type: "roomState", room: room.toJSON() });

    const player = room.getPlayer(playerId);
    if (player) {
      this.broadcast(roomCode, { type: "playerJoined", player }, playerId);
    }
  }

  private handleRejoin(
    ws: WebSocketClient,
    roomCode: string,
    playerId: string
  ): void {
    const roomResult = this.gameManager.rejoinRoom(roomCode, playerId);
    if (roomResult.isErr()) {
      this.send(ws, { type: "error", message: "Could not rejoin room" });
      return;
    }

    const room = roomResult.value;
    this.addConnection(roomCode, playerId, ws);
    this.send(ws, { type: "roomState", room: room.toJSON() });
    this.broadcast(roomCode, { type: "playerReconnected", playerId }, playerId);
  }

  private handleLeave(roomCode: string, playerId: string): void {
    const roomResult = this.gameManager.leaveRoom(roomCode, playerId);
    this.removeConnection(roomCode, playerId);

    if (roomResult.isOk() && roomResult.value) {
      this.broadcast(roomCode, { type: "playerLeft", playerId });
    }
  }

  private handleJoinAsViewer(
    ws: WebSocketClient,
    roomCode: string,
    viewerId: string
  ): void {
    const roomResult = this.gameManager.getRoom(roomCode);

    if (roomResult.isErr()) {
      this.send(ws, { type: "error", message: "Room not found" });
      return;
    }

    const room = roomResult.value;
    room.addViewer({ playerId: viewerId });

    this.addViewerConnection(roomCode, viewerId, ws);
    this.send(ws, { type: "roomState", room: room.toJSON() });

    const viewer = room.getViewer(viewerId);
    if (viewer) {
      this.broadcast(roomCode, { type: "viewerJoined", viewer }, viewerId);
    }
  }

  private handleStart(
    roomCode: string,
    gameId: string,
    timerDuration: number
  ): void {
    const result = this.gameManager.startGame(roomCode, {
      gameId,
      timerDuration,
    });
    if (result.isErr()) return;

    const room = result.value;
    this.broadcast(roomCode, {
      type: "gameStarted",
      room: room.toJSON(),
    });
    this.startQuestionTimer(roomCode, room.timerDuration);
  }

  private handleAnswer(
    ws: WebSocketClient,
    roomCode: string,
    playerId: string,
    answer: string
  ): void {
    const result = this.gameManager.submitAnswer(roomCode, playerId, answer);

    if (result.isErr()) {
      this.send(ws, { type: "error", message: result.error });
      return;
    }

    const room = result.value.room;
    this.broadcast(roomCode, { type: "playerAnswered", playerId });

    // Check if all connected players have answered
    const connectedPlayers = room.players.filter((p) => p.isConnected);
    const allAnswered = connectedPlayers.every((p) => p.hasAnswered);

    if (allAnswered) {
      this.clearTimer(roomCode);
      this.handleTimeUp(roomCode);
    }
  }

  private handleNewGame(roomCode: string): void {
    const result = this.gameManager.resetGame(roomCode);
    if (result.isErr()) return;

    const room = result.value;
    this.broadcast(roomCode, {
      type: "gameReset",
      room: room.toJSON(),
    });
  }
}
