import { CheckIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import HeaderButtonWithToolTip from "./HeaderButtonWithToolTip";
import useCopy from "../../hooks/useCopy";
export function CopyIconButton({ text, tabIndex, checkIconClassName = "h-4 w-4 text-green-400", clipboardIconClassName = "h-4 w-4 text-gray-400", tooltipPlacement = "bottom", }) {
    const { copyText, copied } = useCopy(text);
    return (<>
      <HeaderButtonWithToolTip tooltipPlacement={tooltipPlacement} tabIndex={tabIndex} text={copied ? "Copied" : "Copy"} onClick={copyText}>
        {copied ? (<CheckIcon className={checkIconClassName}/>) : (<ClipboardIcon className={clipboardIconClassName}/>)}
      </HeaderButtonWithToolTip>
    </>);
}
//# sourceMappingURL=CopyIconButton.js.map