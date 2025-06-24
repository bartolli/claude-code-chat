import { OnboardingModes } from "core/protocol/core";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { setDialogMessage, setOnboardingCard, setShowDialog, } from "../../../redux/slices/uiSlice";
import { getLocalStorage, setLocalStorage } from "../../../util/localStorage";
export function useOnboardingCard() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const onboardingCard = useAppSelector((state) => state.ui.onboardingCard);
    const onboardingStatus = getLocalStorage("onboardingStatus");
    const hasDismissedOnboardingCard = getLocalStorage("hasDismissedOnboardingCard");
    let show;
    // Always show if we explicitly want to, e.g. passing free trial
    // and setting up keys
    if (onboardingCard.show) {
        show = true;
    }
    else {
        show = onboardingStatus !== "Completed" && !hasDismissedOnboardingCard;
    }
    async function open(tab) {
        navigate("/");
        dispatch(setOnboardingCard({
            show: true,
            activeTab: tab ?? OnboardingModes.API_KEY,
        }));
    }
    function close(isDialog = false) {
        setLocalStorage("hasDismissedOnboardingCard", true);
        dispatch(setOnboardingCard({ show: false }));
        if (isDialog) {
            dispatch(setDialogMessage(undefined));
            dispatch(setShowDialog(false));
        }
    }
    function setActiveTab(tab) {
        dispatch(setOnboardingCard({ show: true, activeTab: tab }));
    }
    return {
        show,
        setActiveTab,
        open,
        close,
        activeTab: onboardingCard.activeTab,
    };
}
//# sourceMappingURL=useOnboardingCard.js.map