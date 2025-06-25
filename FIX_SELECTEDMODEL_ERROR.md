# Fix for selectedModel is not defined Error

## Problem
After implementing slash commands, the webview crashed with:
```
ReferenceError: selectedModel is not defined
```

## Root Cause
The `selectSelectedModel` selector in `configSlice.ts` was returning an object even when `modelId` was undefined:
```typescript
return model || {
    id: modelId,  // This could be undefined!
    name: modelId === 'default' ? 'Default Model' : modelId
};
```

## Solution
Added a null check to return `null` when there's no selected model:
```typescript
export const selectSelectedModel = (state: { config: ConfigState }) => {
  const modelId = state.config.selectedModel;
  if (!modelId) return null;  // Return null instead of object with undefined id
  
  const availableModels = state.config.availableModels || [];
  const model = availableModels.find(m => m.id === modelId);
  return model || {
    id: modelId,
    name: modelId === 'default' ? 'Default Model' : modelId
  };
};
```

The Footer component already handles the null case properly with the conditional rendering at line 113-118.

## Files Changed
- `src/state/slices/configSlice.ts` - Added null check in selectSelectedModel selector