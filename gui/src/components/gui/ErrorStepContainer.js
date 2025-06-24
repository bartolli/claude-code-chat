import { MinusCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import styled from "styled-components";
import { defaultBorderRadius, vscBackground } from "..";
import HeaderButtonWithToolTip from "./HeaderButtonWithToolTip";
const Div = styled.div `
  padding: 8px;
  background-color: #ff000011;
  border-radius: ${defaultBorderRadius};
  border: 1px solid #cc0000;
  margin: 8px;
`;
function ErrorStepContainer(props) {
    return (<div style={{ backgroundColor: vscBackground, position: "relative" }}>
      <div style={{
            position: "absolute",
            right: "12px",
            top: "12px",
            display: "flex",
        }}>
        <HeaderButtonWithToolTip text="Collapse" onClick={() => props.onClose()}>
          <MinusCircleIcon width="1.3em" height="1.3em"/>
        </HeaderButtonWithToolTip>
        <HeaderButtonWithToolTip text="Delete" onClick={() => props.onDelete()}>
          <XMarkIcon width="1.3em" height="1.3em"/>
        </HeaderButtonWithToolTip>
      </div>
      <Div>
        <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
          {props.error.message}
        </pre>
      </Div>
    </div>);
}
export default ErrorStepContainer;
//# sourceMappingURL=ErrorStepContainer.js.map