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
import { createSyncMiddleware } from '../migration/syncMiddleware';
import { Logger } from '../core/Logger';

const rootReducer = combineReducers({
  session: sessionReducer,
  config: configReducer,
  ui: uiReducer,
  processes: processesReducer,
  claude: claudeReducer,
  mcp: mcpReducer
});

// Get logger instance for middleware
const logger = Logger.getInstance();

// Create the Redux store following GUI pattern
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp', 'meta.sync'],
        // Ignore these paths in the state
      }
    }).concat(createSyncMiddleware(logger)),
  devTools: false // Disable for VS Code extension
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

// Export store instance
export default store;