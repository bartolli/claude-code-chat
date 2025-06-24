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
    costTracking: true
  }
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
    
    initializeConfig: (state, action: PayloadAction<{
      models: any[];
      selectedModel: string;
      features: any;
    }>) => {
      state.availableModels = action.payload.models;
      state.selectedModel = action.payload.selectedModel as ModelType;
      state.features = action.payload.features;
    },
    
    resetConfig: () => initialState
  },
  extraReducers: (builder) => {
    builder.addCase(resetAllState, () => initialState);
  }
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
  initializeConfig
} = configSlice.actions;

// Selectors
export const selectAvailableModels = (state: { config: ConfigState }) => state.config.availableModels || [];
export const selectSelectedModelId = (state: { config: ConfigState }) => state.config.selectedModel;
export const selectSelectedModel = (state: { config: ConfigState }) => {
  const modelId = state.config.selectedModel;
  const availableModels = state.config.availableModels || [];
  const model = availableModels.find(m => m.id === modelId);
  return model || {
    id: modelId,
    name: modelId === 'default' ? 'Default Model' : modelId
  };
};
export const selectAutoSave = (state: { config: ConfigState }) => state.config.autoSave;
export const selectGitBackup = (state: { config: ConfigState }) => state.config.gitBackup;
export const selectTheme = (state: { config: ConfigState }) => state.config.theme;
export const selectFontSize = (state: { config: ConfigState }) => state.config.fontSize;
export const selectFeatures = (state: { config: ConfigState }) => state.config.features || {};

export default configSlice.reducer;