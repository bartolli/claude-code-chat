import { useContext } from "react";
import styled from "styled-components";
import { defaultBorderRadius, vscForeground } from "..";
import { VscThemeContext } from "../../context/VscTheme";
const generateThemeStyles = (theme) => {
    return Object.keys(theme)
        .map((key) => {
        return `
        & ${key} {
          color: ${theme[key]};
        }
      `;
    })
        .join("");
};
const StyledPre = styled.pre `
  & .hljs {
    color: ${vscForeground};
  }

  margin-top: 0;
  margin-bottom: 0;
  border-radius: 0 0 ${defaultBorderRadius} ${defaultBorderRadius} !important;

  ${(props) => generateThemeStyles(props.theme)}
`;
export const SyntaxHighlightedPre = (props) => {
    const currentTheme = useContext(VscThemeContext);
    return <StyledPre {...props} theme={currentTheme.theme}/>;
};
//# sourceMappingURL=SyntaxHighlightedPre.js.map