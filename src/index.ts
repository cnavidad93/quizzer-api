import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadGames } from "./data/games.js";
import { GameManager } from "./game-manager.js";
import { WebSocketHandler } from "./ws-handler.js";

const app = new Hono();
const gameManager = new GameManager();
const wsHandler = new WebSocketHandler(gameManager);

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.get("/health", (c) => c.json({ status: "ok", service: "quizzer-server" }));

app.get("/games", async (c) => {
  const games = await loadGames();
  const previews = games.map((game) => ({
    id: game.id,
    title: game.title,
    image: game.image,
    questionsCount: game.questions.length,
  }));

  return c.json(previews);
});

app.post("/room/create", async (c) => {
  const user = await c.req.json<{
    playerId: string;
    username: string;
    profilePicture: string;
    mode: "pro" | "kid";
  }>();

  if (!user.playerId || !user.username) {
    return c.json({ error: "Missing playerId or username" }, 400);
  }

  const result = gameManager.createRoom(user.playerId);
  if (result.isErr()) {
    return c.json({ error: result.error }, 500);
  }

  const room = result.value;
  room.addPlayer(user);

  gameManager.saveRoom(room);
  return c.json(room.toJSON());
});

// Get room info
app.get("/room/:code", (c) => {
  const code = c.req.param("code").toUpperCase();
  const roomResult = gameManager.getRoom(code);

  if (roomResult.isErr()) {
    return c.json({ error: "Room not found" }, 404);
  }

  return c.json(roomResult.value.toJSON());
});

// Check if room exists (for joining)
app.get("/room/:code/exists", (c) => {
  const code = c.req.param("code").toUpperCase();
  const roomResult = gameManager.getRoom(code);

  if (roomResult.isErr()) {
    return c.json({ exists: false, canJoin: false, error: "Room not found" });
  }

  const room = roomResult.value;

  if (room.status !== "waiting") {
    return c.json({
      exists: true,
      canJoin: false,
      error: "Game has already started",
    });
  }

  if (room.players.length >= 10) {
    return c.json({ exists: true, canJoin: false, error: "Room is full" });
  }

  return c.json({
    exists: true,
    canJoin: true,
    playerCount: room.players.length,
  });
});

// WebSocket endpoint
app.get(
  "/ws",
  upgradeWebSocket(() => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    return {
      onOpen() {
        console.log("WebSocket connected");
      },

      onMessage(event, ws) {
        const data = event.data.toString();

        try {
          const parsed = JSON.parse(data);
          if (parsed.roomCode) {
            currentRoomCode = parsed.roomCode.toUpperCase();
          }
          if (parsed.playerId) {
            currentPlayerId = parsed.playerId;
          }
        } catch {
          // Ignore parse errors here, handler will deal with them
        }

        wsHandler.handleMessage(ws, data);
      },

      onClose() {
        console.log("WebSocket disconnected");
        if (currentRoomCode && currentPlayerId) {
          wsHandler.handleDisconnect(currentRoomCode, currentPlayerId);
        }
      },

      onError(event) {
        console.error("WebSocket error:", event);
      },
    };
  })
);

const server = serve(
  {
    fetch: app.fetch,
    port: parseInt(process.env.PORT || "3001", 10),
  },
  (info) => {
    console.log(`🚀 Quizzer server running on http://localhost:${info.port}`);
    console.log(`📡 WebSocket available at ws://localhost:${info.port}/ws`);
  }
);
injectWebSocket(server);

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  gameManager.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Shutting down...");
  gameManager.close();
  process.exit(0);
});
