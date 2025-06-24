import React from "react";
import { v4 as uuidv4 } from "uuid";
import { HeaderButton } from "..";
import { ToolTip } from "./Tooltip";
const HeaderButtonWithToolTip = React.forwardRef((props, ref) => {
    const id = uuidv4();
    const tooltipId = `header_button_${id}`;
    return (<>
      <HeaderButton hoverBackgroundColor={props.hoverBackgroundColor} backgroundColor={props.backgroundColor} data-tooltip-id={tooltipId} data-testid={props.testId} inverted={props.inverted} disabled={props.disabled} onClick={props.onClick} onKeyDown={props.onKeyDown} className={props.className} style={props.style} ref={ref} tabIndex={props.tabIndex}>
        {props.children}
      </HeaderButton>

      <ToolTip id={tooltipId} place={props.tooltipPlacement ?? "bottom"}>
        <span className="text-xs">{props.text}</span>
      </ToolTip>
    </>);
});
export default HeaderButtonWithToolTip;
//# sourceMappingURL=HeaderButtonWithToolTip.js.map