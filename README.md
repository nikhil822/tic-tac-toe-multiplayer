# Tactical Grid

Multiplayer Tic-Tac-Toe built with a server-authoritative architecture:

- Frontend: React + Redux Toolkit
- Backend: Go module loaded into Nakama
- Infrastructure: Nakama + PostgreSQL via Docker Compose

The important idea in this project is that the browser never decides whether a move is valid. The browser sends player intent, and the Go match handler decides what actually happens.

## How It Works

There are two communication paths in the app:

1. HTTP requests to Nakama for authentication and RPCs.
2. WebSocket messages for live match events and game state updates.

The normal flow is:

1. The frontend authenticates with Nakama using device auth.
2. The frontend opens a Nakama socket.
3. The lobby calls an RPC such as `create_match`, `find_match`, or `list_matches`.
4. The backend RPC either creates or finds an authoritative `tictactoe` match.
5. The frontend joins that match over the socket.
6. Players send move messages over the socket.
7. The Go match handler validates the move, updates server state, and broadcasts the new full game state.
8. Redux stores the latest server snapshot and the UI rerenders from that snapshot.

## Why The Code Is Structured This Way

### Backend

[`backend/main.go`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/backend/main.go) contains the authoritative game logic because Nakama expects a Go `runtime.Match` implementation for live multiplayer logic.

The file does three jobs:

- `InitModule` registers the RPC endpoints and the match handler.
- `TicTacToeMatch` implements the Nakama match lifecycle: init, join, leave, loop, terminate.
- helper functions such as `handleMove`, `checkWinner`, and the RPC handlers keep the lifecycle methods shorter and easier to reason about.

This is why you see both RPC functions and match functions in the same file:

- RPCs solve lobby problems like "create a room" or "find a room".
- match handlers solve real-time game problems like "is this move valid?" and "who won?".

### Frontend

The frontend is split so that UI code does not know about low-level SDK calls:

- [`frontend/src/utils/nakamaService.js`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/utils/nakamaService.js) is the only place that talks directly to the Nakama SDK.
- [`frontend/src/store/gameSlice.js`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/store/gameSlice.js) stores the last authoritative game snapshot from the backend.
- [`frontend/src/hooks/useGame.js`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/hooks/useGame.js) gives components simple derived values like `isMyTurn`, `myPlayer`, and `makeMove`.
- components such as `LobbyScreen` and `Gameboard` focus on rendering and user interactions.

This layering exists so that:

- Nakama-specific logic stays in one place.
- Redux stays as the single UI state source.
- components stay simpler and easier to redesign.

## Backend Walkthrough

### Module startup

When Nakama boots, it calls `InitModule`.

That function registers:

- `create_match`: create a new authoritative Tic-Tac-Toe match
- `find_match`: reuse an open match if possible, otherwise create one
- `list_matches`: return open rooms for the lobby browser
- `tictactoe`: the authoritative match handler

### Match lifecycle

The `TicTacToeMatch` type implements Nakama's match interface.

- `MatchInit`
  Creates the initial empty board and returns the starting label.

- `MatchJoinAttempt`
  Decides whether a player is allowed to join. This is where match-capacity checks happen.

- `MatchJoin`
  Adds players to server state, assigns symbols, starts the game once two players are present, and broadcasts the latest game state.

- `MatchLoop`
  Receives real-time socket messages. In this project, it dispatches:
  - move messages
  - rematch messages
  - ready messages

- `MatchLeave`
  Marks players disconnected and can end the game if a player leaves during play.

### Server-authoritative move validation

Moves are processed in `handleMove`.

That function validates:

- the match is currently playing
- the sender is the active player
- the position is within `0..8`
- the target cell is empty

Only after those checks pass does it:

- place the player's symbol
- increment move count
- check for a win or draw
- switch turns or end the round
- broadcast the new full state

This prevents the client from cheating by sending illegal board states.

## Frontend Walkthrough

### Authentication

`authenticateGuest` in [`nakamaService.js`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/utils/nakamaService.js) uses Nakama device auth.

Why device auth is used here:

- it avoids building a full signup/login flow
- it gives each browser a stable identity
- it works well for local multiplayer testing

The service also stores:

- `nakama_device_id` in local storage
- `nakama_session` in local storage

That is why refreshing the page usually keeps the same player identity.

### Socket connection

After login, `connectSocket` opens the realtime connection.

The socket handlers do two important things:

- `onmatchdata` feeds server broadcasts into Redux
- `onmatchpresence` can be used for player-presence UI and debugging

### Matchmaking

Lobby actions do not create local matches in the browser. They call backend RPCs first.

That is important because the backend must create authoritative matches, not the client.

The frontend then joins the returned `match_id` over the socket.

### Game state rendering

The backend broadcasts a `GameStateMessage` with:

- `game_state`
- an optional human-readable `message`

The reducer stores that snapshot, and hooks/components derive things like:

- whose turn it is
- which symbol belongs to the current player
- whether the game is waiting, playing, or over
- who won

The board UI is therefore a projection of backend state, not an independent game engine.

## File Guide

### Backend

- [`backend/main.go`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/backend/main.go)
  Main Nakama module. Contains RPCs, match lifecycle, and game rules.
- [`backend/Dockerfile`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/backend/Dockerfile)
  Builds the Go plugin and copies it into the Nakama runtime image.
- [`backend/docker-compose.yml`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/backend/docker-compose.yml)
  Starts PostgreSQL and Nakama locally.
- [`backend/local.yml`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/backend/local.yml)
  Local Nakama config used inside the container.

### Frontend

- [`frontend/src/utils/nakamaService.js`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/utils/nakamaService.js)
  Nakama SDK wrapper and networking layer.
- [`frontend/src/store/gameSlice.js`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/store/gameSlice.js)
  Redux slice for auth, matchmaking, and game state.
- [`frontend/src/hooks/useGame.js`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/hooks/useGame.js)
  UI-facing hooks that convert store/service logic into component-friendly values and actions.
- [`frontend/src/components/LobbyScreen.jsx`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/components/LobbyScreen.jsx)
  Matchmaking UI for quick play, create room, and browse rooms.
- [`frontend/src/components/Gameboard.jsx`](/Users/nikhil_13/Documents/assignments/tic-tac-toe-multiplayer/frontend/src/components/Gameboard.jsx)
  Main in-match UI that renders board state, players, and actions.

## Local Development

### Start backend

```bash
cd backend
docker compose up --build
```

### Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Common Debugging Tips

- If login fails with `Failed to fetch`, verify the frontend is using `127.0.0.1:7350` with SSL disabled for local development.
- If a move is ignored, check the Nakama logs first. The server decides whether the move is valid.
- If the UI looks stale, inspect the latest `onmatchdata` payload. Most UI state should come from that payload.
- If Docker builds but gameplay does not work, make sure the backend container was rebuilt after Go code changes.

## Commenting Philosophy In This Repo

Comments are intentionally focused on:

- why a layer exists
- why a rule is enforced in a certain place
- why a specific network flow is used

They avoid restating obvious syntax so the code stays readable without turning into noise.
