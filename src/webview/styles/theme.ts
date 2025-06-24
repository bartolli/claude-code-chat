// Direct copy from GUI's theme system for exact same look and feel
// All vscode variables https://gist.github.com/estruyf/ba49203e1a7d6868e9320a4ea480c27a

// The current default theme is dark with blue accents
export const THEME_COLORS = {
  background: {
    vars: [
      "--vscode-sideBar-background",
      "--vscode-editor-background",
      "--vscode-panel-background",
    ],
    default: "#1e1e1e", // dark gray
  },
  foreground: {
    vars: [
      "--vscode-sideBar-foreground",
      "--vscode-editor-foreground",
      "--vscode-panel-foreground",
    ],
    default: "#e6e6e6", // light gray
  },
  "editor-background": {
    vars: ["--vscode-editor-background"],
    default: "#1e1e1e", // dark gray
  },
  "editor-foreground": {
    vars: ["--vscode-editor-foreground"],
    default: "#e6e6e6", // light gray
  },
  "primary-background": {
    vars: ["--vscode-button-background"],
    default: "#2c5aa0", // medium blue
  },
  "primary-foreground": {
    vars: ["--vscode-button-foreground"],
    default: "#ffffff", // white
  },
  "primary-hover": {
    vars: ["--vscode-button-hoverBackground"],
    default: "#3a6db3", // lighter blue
  },
  "secondary-background": {
    vars: ["--vscode-button-secondaryBackground"],
    default: "#303030", // medium dark gray
  },
  "secondary-foreground": {
    vars: ["--vscode-button-secondaryForeground"],
    default: "#e6e6e6", // light gray
  },
  "secondary-hover": {
    vars: ["--vscode-button-secondaryHoverBackground"],
    default: "#3a3a3a", // medium gray
  },
  border: {
    vars: ["--vscode-sideBar-border", "--vscode-panel-border"],
    default: "#2a2a2a", // dark gray border
  },
  "border-focus": {
    vars: ["--vscode-focusBorder"],
    default: "#3a6db3", // lighter blue
  },
  // Command styles are used for tip-tap editor
  "command-background": {
    vars: ["--vscode-commandCenter-background"],
    default: "#252525", // dark gray
  },
  "command-foreground": {
    vars: ["--vscode-commandCenter-foreground"],
    default: "#e6e6e6", // light gray
  },
  "command-border": {
    vars: ["--vscode-commandCenter-inactiveBorder"],
    default: "#555555", // medium gray
  },
  "command-border-focus": {
    vars: ["--vscode-commandCenter-activeBorder"],
    default: "#4d8bf0", // bright blue
  },
  description: {
    vars: ["--vscode-descriptionForeground"],
    default: "#b3b3b3", // medium light gray
  },
  "description-muted": {
    vars: ["--vscode-list-deemphasizedForeground"],
    default: "#8c8c8c", // medium gray
  },
  "input-background": {
    vars: ["--vscode-input-background"],
    default: "#2d2d2d", // dark gray
  },
  "input-foreground": {
    vars: ["--vscode-input-foreground"],
    default: "#e6e6e6", // light gray
  },
  "input-border": {
    vars: [
      "--vscode-input-border",
      "--vscode-commandCenter-inactiveBorder",
      "vscode-border",
    ],
    default: "#555555", // medium gray
  },
  "input-placeholder": {
    vars: ["--vscode-input-placeholderForeground"],
    default: "#9e9e9e", // medium light gray
  },
  "table-oddRow": {
    vars: ["--vscode-tree-tableOddRowsBackground"],
    default: "#2d2d2d", // dark gray
  },
  "badge-background": {
    vars: ["--vscode-badge-background"],
    default: "#4d4d4d", // medium dark gray
  },
  "badge-foreground": {
    vars: ["--vscode-badge-foreground"],
    default: "#ffffff", // white
  },
  success: {
    vars: [
      "--vscode-notebookStatusSuccessIcon-foreground",
      "--vscode-testing-iconPassed",
      "--vscode-gitDecoration-addedResourceForeground",
      "--vscode-charts-green",
    ],
    default: "#4caf50", // green
  },
  warning: {
    vars: [
      "--vscode-editorWarning-foreground",
      "--vscode-list-warningForeground",
    ],
    default: "#ffb74d", // amber/yellow
  },
  error: {
    vars: ["--vscode-editorError-foreground", "--vscode-list-errorForeground"],
    default: "#f44336", // red
  },
  link: {
    vars: ["--vscode-textLink-foreground"],
    default: "#5c9ce6", // medium blue
  },
  accent: {
    vars: ["--vscode-tab-activeBorderTop", "--vscode-focusBorder"],
    default: "#4d8bf0", // bright blue
  },
  "find-match": {
    vars: ["--vscode-editor-findMatchBackground"],
    default: "#264f7840", // translucent blue
  },
  "find-match-selected": {
    vars: ["--vscode-editor-findMatchHighlightBackground"],
    default: "#ffb74d40", // translucent amber
  },
  "list-hover": {
    vars: ["--vscode-list-hoverBackground"],
    default: "#383838", // medium dark gray
  },
  "list-active": {
    vars: ["--vscode-list-activeSelectionBackground"],
    default: "#2c5aa050", // translucent medium blue
  },
  "list-active-foreground": {
    vars: ["--vscode-list-activeSelectionForeground"],
    default: "#ffffff", // white
  },
};

export const THEME_CSS_VARS = Object.values(THEME_COLORS)
  .map((value) => value.vars)
  .flat();

export const THEME_CSS_VAR_DEFAULTS = Object.entries(THEME_COLORS).reduce(
  (acc, [_, value]) => {
    value.vars.forEach((varName) => {
      acc[varName] = value.default;
    });
    return acc;
  },
  {} as Record<string, string>,
);

export const THEME_DEFAULTS = Object.entries(THEME_COLORS).reduce(
  (acc, [key, value]) => {
    acc[key] = value.default;
    return acc;
  },
  {} as Record<string, string>,
);

// Generates recursive CSS variable fallback for a given color name
export const getRecursiveVar = (vars: string[], defaultColor: string) => {
  return [...vars].reverse().reduce((curr, varName) => {
    return `var(${varName}, ${curr})`;
  }, defaultColor);
};

export const varWithFallback = (colorName: keyof typeof THEME_COLORS) => {
  const themeVals = THEME_COLORS[colorName];
  if (!themeVals) {
    throw new Error(`Invalid theme color name ${colorName}`);
  }
  return getRecursiveVar(themeVals.vars, themeVals.default);
};

// Initialize theme from VS Code
export const initializeTheme = () => {
  // VS Code already sets CSS variables on the body
  // We just need to ensure our theme system can use them
  const computedStyle = getComputedStyle(document.body);
  
  // Log available VS Code theme variables for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('VS Code theme variables:', {
      background: computedStyle.getPropertyValue('--vscode-editor-background'),
      foreground: computedStyle.getPropertyValue('--vscode-editor-foreground'),
      buttonBg: computedStyle.getPropertyValue('--vscode-button-background'),
    });
  }
};