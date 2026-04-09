import React, { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './store';
import LoginScreen from './components/LoginScreen';
import LobbyScreen from './components/LobbyScreen';
import GameBoard from './components/GameBoard';
import nakamaService from './utils/nakamaService';
import './styles/global.css';

// Inner app handles routing between screens
function AppInner() {
  const dispatch = useDispatch();
  const { session, matchId, isConnected } = useSelector((s) => s.game);
  const [screen, setScreen] = useState('login'); // login | lobby | game

  // Init nakama service with store
  useEffect(() => {
    nakamaService.init(dispatch, store.getState);
  }, [dispatch]);

  // Route based on state
  useEffect(() => {
    if (!session) {
      setScreen('login');
    } else if (matchId) {
      setScreen('game');
    } else if (isConnected) {
      setScreen('lobby');
    }
  }, [session, matchId, isConnected]);

  const handleLogin = () => {
    setScreen('lobby');
  };

  return (
    <>
      {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'game' && <GameBoard />}
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}