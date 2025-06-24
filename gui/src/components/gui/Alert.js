import { CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, } from "@heroicons/react/24/solid";
import { vscBackground } from "..";
const ALERT_CONFIGS = {
    info: {
        Icon: InformationCircleIcon,
    },
    success: {
        Icon: CheckCircleIcon,
    },
    warning: {
        Icon: ExclamationTriangleIcon,
    },
    error: {
        Icon: ExclamationCircleIcon,
    },
};
function Alert({ children, type = "info" }) {
    const { Icon } = ALERT_CONFIGS[type];
    return (<div className="bg-editor-foreground rounded-lg border-l-4 p-4 opacity-70 shadow-none">
      <div className="flex items-start">
        <Icon className="h-6 min-h-5 w-6 min-w-5" style={{ color: vscBackground }}/>

        <div className="ml-3" style={{ color: vscBackground }}>
          {children}
        </div>
      </div>
    </div>);
}
export default Alert;
//# sourceMappingURL=Alert.js.map