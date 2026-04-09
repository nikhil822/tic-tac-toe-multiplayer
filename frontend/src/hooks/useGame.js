import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import nakamaService from "../utils/nakamaService";
import { setPendingMove, clearError } from "../store/gameSlice";

// These hooks are the UI-friendly layer on top of the Redux store and Nakama service.
// Components consume simple values like "isMyTurn" without needing to know transport details.
export function useGame() {
  const dispatch = useDispatch();
  const game = useSelector((state) => state.game);

  const myUserId = nakamaService.getCurrentUserId();

  const myPlayer = game.players.find((p) => p.user_id === myUserId);
  const opponent = game.players.find((p) => p.user_id !== myUserId);

  const isMyTurn = game.currentTurn === myUserId && game.status === "playing";
  const mySymbol = myPlayer?.symbol;
  const opponentSymbol = opponent?.symbol;

  const makeMove = useCallback(
    async (position) => {
      // Ignore invalid UI clicks early so we do not spam the server with obvious bad moves.
      if (!isMyTurn) return;
      if (game.board[position] !== "") return;
      if (game.pendingMove !== null) return;

      dispatch(setPendingMove(position));
      await nakamaService.sendMove(position);
    },
    [isMyTurn, game.board, game.pendingMove, dispatch],
  );

  const requestRematch = useCallback(async () => {
    await nakamaService.sendRematch();
  }, []);

  const leaveGame = useCallback(async () => {
    await nakamaService.leaveMatch();
  }, []);

  const dismissError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const getWinnerName = () => {
    if (!game.winner) return null;
    if (game.winner === "draw") return "Draw";
    const winner = game.players.find((p) => p.user_id === game.winner);
    return winner?.username || "Unknown";
  };

  const isWinner = game.winner === myUserId;
  const isLoser =
    game.winner && game.winner !== "draw" && game.winner !== myUserId;
  const isDraw = game.winner === "draw";

  return {
    ...game,
    myPlayer,
    opponent,
    myUserId,
    mySymbol,
    opponentSymbol,
    isMyTurn,
    isWinner,
    isLoser,
    isDraw,
    getWinnerName,
    makeMove,
    requestRematch,
    leaveGame,
    dismissError,
  };
}

export function useAuth() {
  const dispatch = useDispatch();
  const { session, account, isConnected, connectionError } = useSelector(
    (s) => s.game,
  );

  const login = useCallback(async (username) => {
    // Login is two-step: authenticate over HTTP, then open the realtime socket.
    await nakamaService.authenticateGuest(username);
    await nakamaService.connectSocket();
  }, []);

  const updateUsername = useCallback(async (username) => {
    await nakamaService.updateUsername(username);
  }, []);

  return {
    session,
    account,
    isConnected,
    connectionError,
    isAuthenticated: !!session,
    userId: session?.user_id,
    username: account?.user?.username || account?.user?.display_name,
    login,
    updateUsername,
  };
}

export function useMatchmaking() {
  const { isSearching, matchList, matchId } = useSelector((s) => s.game);

  const findMatch = useCallback(async () => {
    // Quick play delegates pairing logic to the backend.
    await nakamaService.findMatch();
  }, []);

  const createMatch = useCallback(async () => {
    await nakamaService.createMatch();
  }, []);

  const joinMatch = useCallback(async (id) => {
    await nakamaService.joinMatchById(id);
  }, []);

  const listMatches = useCallback(async () => {
    return await nakamaService.listMatches();
  }, []);

  const leaveMatch = useCallback(async () => {
    await nakamaService.leaveMatch();
  }, []);

  return {
    isSearching,
    matchList,
    matchId,
    findMatch,
    createMatch,
    joinMatch,
    listMatches,
    leaveMatch,
  };
}
