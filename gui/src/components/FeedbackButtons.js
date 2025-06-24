import { HandThumbDownIcon, HandThumbUpIcon, } from "@heroicons/react/24/outline";
import { useContext, useState } from "react";
import { IdeMessengerContext } from "../context/IdeMessenger";
import { useAppSelector } from "../redux/hooks";
import HeaderButtonWithToolTip from "./gui/HeaderButtonWithToolTip";
export default function FeedbackButtons({ item }) {
    const [feedback, setFeedback] = useState(undefined);
    const ideMessenger = useContext(IdeMessengerContext);
    const sessionId = useAppSelector((store) => store.session.id);
    const sendFeedback = (feedback) => {
        setFeedback(feedback);
        if (item.promptLogs?.length) {
            for (const promptLog of item.promptLogs) {
                ideMessenger.post("devdata/log", {
                    name: "chatFeedback",
                    data: {
                        ...promptLog,
                        feedback,
                        sessionId,
                    },
                });
            }
        }
    };
    return (<>
      <HeaderButtonWithToolTip text="Helpful" tabIndex={-1} onClick={() => sendFeedback(true)}>
        <HandThumbUpIcon className={`mx-0.5 h-3.5 w-3.5 ${feedback === true ? "text-green-400" : "text-gray-500"}`}/>
      </HeaderButtonWithToolTip>
      <HeaderButtonWithToolTip text="Unhelpful" tabIndex={-1} onClick={() => sendFeedback(false)}>
        <HandThumbDownIcon className={`h-3.5 w-3.5 ${feedback === false ? "text-red-400" : "text-gray-500"}`}/>
      </HeaderButtonWithToolTip>
    </>);
}
//# sourceMappingURL=FeedbackButtons.js.map