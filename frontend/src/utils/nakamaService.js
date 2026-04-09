import { Client } from '@heroiclabs/nakama-js';
import {
  setSession, setAccount, setConnected, setConnectionError,
  setMatchId, setMatchList, setSearching, updateGameState,
  setError, setRematchRequested, resetMatch,
} from '../store/gameSlice';

const OP_CODE_MOVE = 1;
const OP_CODE_GAME_STATE = 2;
const OP_CODE_REMATCH = 6;
const OP_CODE_READY = 7;

// Nakama server config - update these for your deployment
const NAKAMA_HOST = import.env.VITE_BACKEND_URL;
const NAKAMA_PORT = '7350';
const NAKAMA_USE_SSL = false;
const SERVER_KEY = 'defaultkey';

// NakamaService is the frontend's single integration point with the Nakama SDK.
// Components never call the SDK directly; they talk to this service through hooks.
class NakamaService {
  constructor() {
    this.client = new Client(SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_USE_SSL);
    this.socket = null;
    this.session = null;
    this.currentMatchId = null;
    this.dispatch = null;
    this.getState = null;
  }

  init(dispatch, getState) {
    this.dispatch = dispatch;
    this.getState = getState;
  }

  async authenticateGuest(username) {
    try {
      // Device auth gives each browser a stable identity without a signup flow.
      let deviceId = localStorage.getItem('nakama_device_id');
      if (!deviceId) {
        deviceId = 'device-' + Math.random().toString(36).substr(2, 16);
        localStorage.setItem('nakama_device_id', deviceId);
      }

      // Reuse a stored session when possible to avoid authenticating on every refresh.
      const savedSession = localStorage.getItem('nakama_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          if (!this.client.isSessionExpired(session)) {
            this.session = session;
            this.dispatch(setSession(session));
            await this.loadAccount();
            return session;
          }
        } catch (e) {
          localStorage.removeItem('nakama_session');
        }
      }

      // If there is no valid session, create or restore the Nakama account from the device id.
      const session = await this.client.authenticateDevice(deviceId, true, username);
      this.session = session;
      localStorage.setItem('nakama_session', JSON.stringify(session));
      this.dispatch(setSession(session));
      await this.loadAccount();
      return session;
    } catch (err) {
      console.error('Authentication failed:', err);
      this.dispatch(setConnectionError('Authentication failed: ' + err.message));
      throw err;
    }
  }

  async loadAccount() {
    try {
      const account = await this.client.getAccount(this.session);
      this.dispatch(setAccount(account));
      return account;
    } catch (err) {
      console.error('Failed to load account:', err);
    }
  }

  async updateUsername(username) {
    try {
      await this.client.updateAccount(this.session, { username, displayName: username });
      await this.loadAccount();
    } catch (err) {
      console.error('Failed to update username:', err);
      throw err;
    }
  }

  async connectSocket() {
    try {
      if (this.socket && this.socket.isConnected()) return;

      this.socket = this.client.createSocket(NAKAMA_USE_SSL);

      // The socket is the real-time path for match state updates.
      this.socket.onclose = (evt) => {
        console.log('Socket closed:', evt);
        this.dispatch(setConnected(false));
        this.currentMatchId = null;
      };

      this.socket.onerror = (evt) => {
        console.error('Socket error:', evt);
        this.dispatch(setConnectionError('Connection error'));
      };

      this.socket.onmatchdata = (matchData) => {
        this.handleMatchData(matchData);
      };

      this.socket.onmatchpresence = (evt) => {
        console.log('Presence event:', evt);
      };

      this.socket.ondisconnect = () => {
        this.dispatch(setConnected(false));
      };

      await this.socket.connect(this.session, true);
      this.dispatch(setConnected(true));
      console.log('Socket connected');
    } catch (err) {
      console.error('Socket connection failed:', err);
      this.dispatch(setConnectionError('Failed to connect: ' + err.message));
      throw err;
    }
  }

  handleMatchData(matchData) {
    const opCode = matchData.op_code;

    try {
      const data = JSON.parse(new TextDecoder().decode(matchData.data));

      switch (opCode) {
        case OP_CODE_GAME_STATE:
          // The Redux store mirrors the authoritative server snapshot.
          if (data.error) {
            this.dispatch(setError(data.error));
          } else if (data.game_state) {
            this.dispatch(updateGameState(data));
          }
          break;
        default:
          console.log('Unknown opcode:', opCode, data);
      }
    } catch (err) {
      console.error('Failed to parse match data:', err);
    }
  }

  async findMatch() {
    try {
      this.dispatch(setSearching(true));
      // Quick play is implemented as an RPC so the server can decide whether to reuse or create a match.
      const result = await this.client.rpc(this.session, 'find_match', {});
      const data = result.payload || {};
      await this.joinMatch(data.match_id);
    } catch (err) {
      console.error('Find match failed:', err);
      this.dispatch(setError('Failed to find match: ' + err.message));
      this.dispatch(setSearching(false));
      throw err;
    }
  }

  async createMatch() {
    try {
      this.dispatch(setSearching(true));
      // Creating a room is also server-driven because the backend creates authoritative matches.
      const result = await this.client.rpc(this.session, 'create_match', {});
      const data = result.payload || {};
      await this.joinMatch(data.match_id);
    } catch (err) {
      console.error('Create match failed:', err);
      this.dispatch(setError('Failed to create match: ' + err.message));
      this.dispatch(setSearching(false));
      throw err;
    }
  }

  async listMatches() {
    try {
      const result = await this.client.rpc(this.session, 'list_matches', {});
      const data = result.payload || {};
      this.dispatch(setMatchList(data.matches || []));
      return data.matches || [];
    } catch (err) {
      console.error('List matches failed:', err);
      return [];
    }
  }

  async joinMatch(matchId) {
    try {
      if (this.currentMatchId) {
        await this.leaveMatch();
      }

      // Joining is a socket action because the client must subscribe to live match events.
      const match = await this.socket.joinMatch(matchId);
      this.currentMatchId = match.match_id;
      this.dispatch(setMatchId(match.match_id));
      this.dispatch(setSearching(false));
      console.log('Joined match:', match.match_id);
    } catch (err) {
      console.error('Join match failed:', err);
      this.dispatch(setError('Failed to join match: ' + err.message));
      this.dispatch(setSearching(false));
      throw err;
    }
  }

  async joinMatchById(matchId) {
    await this.joinMatch(matchId);
  }

  async leaveMatch() {
    try {
      if (this.socket && this.currentMatchId) {
        await this.socket.leaveMatch(this.currentMatchId);
        this.currentMatchId = null;
        this.dispatch(resetMatch());
      }
    } catch (err) {
      console.error('Leave match failed:', err);
    }
  }

  async sendMove(position) {
    if (!this.socket || !this.currentMatchId) return;
    try {
      // The client sends only intent. The server validates turn order and board rules.
      const data = JSON.stringify({ position });
      await this.socket.sendMatchState(this.currentMatchId, OP_CODE_MOVE, data);
    } catch (err) {
      console.error('Send move failed:', err);
      this.dispatch(setError('Failed to send move'));
    }
  }

  async sendRematch() {
    if (!this.socket || !this.currentMatchId) return;
    try {
      // Rematches are coordinated by the server after both players opt in.
      await this.socket.sendMatchState(this.currentMatchId, OP_CODE_REMATCH, '{}');
      this.dispatch(setRematchRequested(true));
    } catch (err) {
      console.error('Send rematch failed:', err);
    }
  }

  async sendReady() {
    if (!this.socket || !this.currentMatchId) return;
    try {
      await this.socket.sendMatchState(this.currentMatchId, OP_CODE_READY, '{}');
    } catch (err) {
      console.error('Send ready failed:', err);
    }
  }

  isConnected() {
    return this.socket && this.socket.isConnected();
  }

  getCurrentUserId() {
    return this.session?.user_id;
  }
}

export const nakamaService = new NakamaService();
export default nakamaService;
