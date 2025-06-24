import styled from "styled-components";
const HoverItem = styled.span `
  padding: 0 ${(props) => props.px ?? 4}px;
  padding-top: 2px;
  padding-bottom: 2px;
  cursor: pointer;
  transition:
    color 200ms,
    background-color 200ms,
    box-shadow 200ms;
`;
export default HoverItem;
//# sourceMappingURL=HoverItem.js.map