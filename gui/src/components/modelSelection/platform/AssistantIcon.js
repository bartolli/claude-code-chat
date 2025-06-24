import { ComputerDesktopIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { isLocalProfile } from "../../../util";
export default function AssistantIcon({ assistant, size }) {
    const sizeTw = size ?? 4;
    if (isLocalProfile(assistant)) {
        return (<div className={`h-${sizeTw} w-${sizeTw} bg-lightgray flex items-center justify-center rounded-full`}>
        <ComputerDesktopIcon className={`h-${sizeTw - 1} w-${sizeTw - 1} font-bold text-black`}/>
      </div>);
    }
    else if (assistant.iconUrl) {
        return (<img src={assistant.iconUrl} className={`h-${sizeTw} w-${sizeTw} rounded-full`} alt=""/>);
    }
    else {
        return <SparklesIcon />;
    }
}
//# sourceMappingURL=AssistantIcon.js.map