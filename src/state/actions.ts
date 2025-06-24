/**
 * Global Redux actions
 */

import { createAction } from '@reduxjs/toolkit';

// Global reset action for testing
export const resetAllState = createAction('RESET_ALL_STATE');