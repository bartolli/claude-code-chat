/**
 * Configuration state slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ConfigState } from '../../types/state';
import { ModelType } from '../../types/claude';
import { resetAllState } from '../actions';

const initialState: ConfigState = {
  selectedModel: 'sonnet',
  autoSave: true,
  gitBackup: false,
  theme: 'dark',
  fontSize: 14,
  availableModels: [],
  features: {
    planMode: true,
    thinkingMode: true,
    costTracking: true,
  },
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setSelectedModel: (state, action: PayloadAction<ModelType>) => {
      state.selectedModel = action.payload;
    },

    setAutoSave: (state, action: PayloadAction<boolean>) => {
      state.autoSave = action.payload;
    },

    setGitBackup: (state, action: PayloadAction<boolean>) => {
      state.gitBackup = action.payload;
    },

    setTheme: (state, action: PayloadAction<string | undefined>) => {
      state.theme = action.payload;
    },

    setFontSize: (state, action: PayloadAction<number | undefined>) => {
      state.fontSize = action.payload;
    },

    updateConfig: (state, action: PayloadAction<Partial<ConfigState>>) => {
      return { ...state, ...action.payload };
    },

    setAvailableModels: (state, action: PayloadAction<any[]>) => {
      state.availableModels = action.payload;
    },

    setFeatures: (state, action: PayloadAction<any>) => {
      state.features = action.payload;
    },

    initializeConfig: (
      state,
      action: PayloadAction<{
        /** Available model configurations */
        models: any[];
        /** Currently selected model ID */
        selectedModel: string;
        /** Feature flags and settings */
        features: any;
      }>
    ) => {
      state.availableModels = action.payload.models;
      state.selectedModel = action.payload.selectedModel as ModelType;
      state.features = action.payload.features;
    },

    resetConfig: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  },
});

export const {
  setSelectedModel,
  setAutoSave,
  setGitBackup,
  setTheme,
  setFontSize,
  updateConfig,
  resetConfig,
  setAvailableModels,
  setFeatures,
  initializeConfig,
} = configSlice.actions;

// Selectors
/**
 * Select all available models
 * @param state - The Redux state object
 * @param state.config - The config slice of the state
 * @returns Array of available model configurations
 */
export const selectAvailableModels = (state: {
  /** The config slice of the state */
  config: ConfigState;
}) => state.config.availableModels || [];
/**
 * Select the currently selected model ID
 * @param state - The Redux state object
 * @param state.config - The config slice of the state
 * @returns The selected model ID
 */
export const selectSelectedModelId = (state: {
  /** The config slice of the state */
  config: ConfigState;
}) => state.config.selectedModel;
/**
 * Select the currently selected model object
 * @param state - The Redux state object
 * @param state.config - The config slice of the state
 * @returns The selected model object or null if not found
 */
export const selectSelectedModel = (state: {
  /** The config slice of the state */
  config: ConfigState;
}) => {
  const modelId = state.config.selectedModel;
  if (!modelId) {
    return null;
  }

  const availableModels = state.config.availableModels || [];
  const model = availableModels.find((m) => m.id === modelId);
  return (
    model || {
      id: modelId,
      name: modelId === 'default' ? 'Default Model' : modelId,
    }
  );
};
/**
 * Select auto-save setting
 * @param state - The Redux state object
 * @param state.config - The config slice of the state
 * @returns Whether auto-save is enabled
 */
export const selectAutoSave = (state: {
  /** The config slice of the state */
  config: ConfigState;
}) => state.config.autoSave;
/**
 * Select git backup setting
 * @param state - The Redux state object
 * @param state.config - The config slice of the state
 * @returns Whether git backup is enabled
 */
export const selectGitBackup = (state: {
  /** The config slice of the state */
  config: ConfigState;
}) => state.config.gitBackup;
/**
 * Select current theme
 * @param state - The Redux state object
 * @param state.config - The config slice of the state
 * @returns The current theme name or undefined
 */
export const selectTheme = (state: {
  /** The config slice of the state */
  config: ConfigState;
}) => state.config.theme;
/**
 * Select font size setting
 * @param state - The Redux state object
 * @param state.config - The config slice of the state
 * @returns The font size in pixels or undefined
 */
export const selectFontSize = (state: {
  /** The config slice of the state */
  config: ConfigState;
}) => state.config.fontSize;
/**
 * Select feature flags
 * @param state - The Redux state object
 * @param state.config - The config slice of the state
 * @returns Object containing feature flags
 */
export const selectFeatures = (state: {
  /** The config slice of the state */
  config: ConfigState;
}) => state.config.features || {};

export default configSlice.reducer;
