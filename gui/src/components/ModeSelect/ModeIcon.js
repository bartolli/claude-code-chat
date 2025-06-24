import { ChatBubbleLeftIcon, SparklesIcon } from "@heroicons/react/24/outline";
export function ModeIcon({ mode, className = "xs:h-3 xs:w-3 h-3 w-3", }) {
    switch (mode) {
        case "agent":
            return <SparklesIcon className={className}/>;
        case "chat":
            return <ChatBubbleLeftIcon className={className}/>;
    }
}
//# sourceMappingURL=ModeIcon.js.map