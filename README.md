# 🎮 Quizzer API

A real-time multiplayer quiz game server built with WebSockets, powered by Hono and TypeScript.

## ✨ Features

- 🚀 **Real-time Multiplayer** - WebSocket-based game rooms for instant synchronization
- 🎯 **Multiple Game Modes** - Support for multiple-choice and autocomplete questions
- 🌍 **Themed Quiz Collections** - Pre-loaded quizzes (All, America, Europe)
- 👥 **Room-based Architecture** - Create and join game rooms with unique codes
- ⏱️ **Configurable Timers** - Customizable time limits per question
- 📊 **Live Scoring** - Real-time score tracking and leaderboards
- 🔄 **Reconnection Support** - Players can rejoin games in progress
- 🏥 **Health Monitoring** - Built-in health check endpoint

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: [Hono](https://hono.dev/) - Ultra-fast web framework
- **WebSockets**: @hono/node-ws
- **Language**: TypeScript
- **Error Handling**: neverthrow
- **Dev Tools**: tsx for hot reload

## 📋 Prerequisites

- Node.js 20.x or higher
- npm or yarn

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone git@github.com:cnavidad93/quizzer-api.git
cd quizzer-server

# Install dependencies
npm install
```

### Development

```bash
# Run in development mode with hot reload
npm run dev
```

The server will start on `http://localhost:8080` by default.

### Production

```bash
# Build the project
npm run build

# Start the production server
npm start
```

### Docker

```bash
# Build the Docker image
docker build -t quizzer-server .

# Run the container
docker run -p 8080:8080 quizzer-server
```

## 📡 API Endpoints

### HTTP Endpoints

#### `GET /health`

Health check endpoint

```json
{
  "status": "ok",
  "service": "quizzer-server"
}
```

#### `GET /games`

Fetch available quiz games

```json
[
  {
    "id": "game-id",
    "title": "Quiz Title",
    "image": "image-url",
    "questionsCount": 10
  }
]
```

#### `POST /room/create`

Create a new game room

```json
// Request
{
  "playerId": "player-uuid",
  "username": "PlayerName",
  "profilePicture": "avatar-url"
}

// Response
{
  "roomCode": "ABC123",
  "players": [...],
  "game": null,
  "host": "player-uuid"
}
```

#### `GET /room/:roomCode`

Get room information

### WebSocket Events

Connect to `/ws` for real-time communication.

#### Client → Server Messages

**Join Room**

```json
{
  "type": "join",
  "roomCode": "ABC123",
  "username": "PlayerName",
  "playerId": "player-uuid",
  "profilePicture": "avatar-url"
}
```

**Rejoin Room**

```json
{
  "type": "rejoin",
  "roomCode": "ABC123",
  "playerId": "player-uuid"
}
```

**Start Game**

```json
{
  "type": "start",
  "roomCode": "ABC123",
  "gameId": "game-id",
  "timerDuration": 30
}
```

**Submit Answer**

```json
{
  "type": "answer",
  "roomCode": "ABC123",
  "playerId": "player-uuid",
  "answer": "answer-text"
}
```

**Next Question**

```json
{
  "type": "nextQuestion",
  "roomCode": "ABC123"
}
```

**Leave Room**

```json
{
  "type": "leave",
  "roomCode": "ABC123",
  "playerId": "player-uuid"
}
```

#### Server → Client Messages

The server broadcasts various events including:

- `roomUpdated` - Room state changes
- `gameStarted` - Game has begun
- `questionStarted` - New question available
- `playerAnswered` - Someone submitted an answer
- `questionEnded` - Question time expired
- `gameEnded` - Game completed
- `error` - Error messages

## 🎯 Game Flow

1. **Room Creation**: Host creates a room and receives a unique room code
2. **Player Join**: Players join using the room code
3. **Game Start**: Host selects a quiz and starts the game
4. **Questions**: Players answer questions within the time limit
5. **Scoring**: Points awarded based on correctness and speed
6. **Results**: Final leaderboard displayed at game end

## 🗂️ Project Structure

```
quizzer-server/
├── src/
│   ├── data/           # Quiz data files
│   │   ├── all.json
│   │   ├── america.json
│   │   ├── europe.json
│   │   └── games.ts
│   ├── game-manager.ts # Room and game state management
│   ├── game-room.ts    # Individual room logic
│   ├── index.ts        # Server entry point
│   ├── types.ts        # TypeScript type definitions
│   ├── utils.ts        # Utility functions
│   └── ws-handler.ts   # WebSocket message handling
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuration

Set environment variables:

```bash
# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Server port (default: 8080)
PORT=8080
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

Built with ❤️ using modern web technologies

---

**Happy Quizzing! 🎉**
