import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './gameSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Socket is not serializable, ignore it
        ignoredPaths: ['game.socket'],
        ignoredActions: ['game/setSession'],
      },
    }),
});

export default store;