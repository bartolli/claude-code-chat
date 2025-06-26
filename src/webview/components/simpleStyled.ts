// Simplified styled components to avoid circular dependencies
import styled from 'styled-components';

export const defaultBorderRadius = "5px";
export const lightGray = "#999998";

// Simple layout components without theme dependencies
export const LayoutTopDiv = styled.div`
  height: 100%;
  border-radius: ${defaultBorderRadius};
  position: relative;
  overflow-x: hidden;
  background-color: var(--vscode-editor-background);
`;

export const GridDiv = styled.div`
  display: grid;
  grid-template-rows: 1fr auto;
  height: 100vh;
  overflow: hidden;
`;