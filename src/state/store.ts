/**
 * Redux store configuration - following GUI pattern
 */

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import sessionReducer from './slices/sessionSlice';
import configReducer from './slices/configSlice';
import uiReducer from './slices/uiSlice';
import processesReducer from './slices/processesSlice';
import claudeReducer from './slices/claudeSlice';
import mcpReducer from './slices/mcpSlice';

const rootReducer = combineReducers({
  session: sessionReducer,
  config: configReducer,
  ui: uiReducer,
  processes: processesReducer,
  claude: claudeReducer,
  mcp: mcpReducer
});

// Create the Redux store following GUI pattern
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
      }
    }),
  devTools: false // Disable for VS Code extension
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// Export store instance
export default store;