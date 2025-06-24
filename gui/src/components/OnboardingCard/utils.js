import { getLocalStorage, setLocalStorage } from "../../util/localStorage";
// If there is no value in local storage for "onboardingStatus",
// it implies that the user has not begun or completed onboarding.
export function isNewUserOnboarding() {
    // We used to use "onboardingComplete", but switched to "onboardingStatus"
    const onboardingCompleteLegacyValue = localStorage.getItem("onboardingComplete");
    if (onboardingCompleteLegacyValue === "true") {
        setLocalStorage("onboardingStatus", "Completed");
        localStorage.removeItem("onboardingComplete");
    }
    const onboardingStatus = getLocalStorage("onboardingStatus");
    return onboardingStatus === undefined;
}
export const defaultOnboardingCardState = {
    show: false,
    activeTab: undefined,
};
export var OllamaConnectionStatuses;
(function (OllamaConnectionStatuses) {
    OllamaConnectionStatuses["WaitingToDownload"] = "WaitingToDownload";
    OllamaConnectionStatuses["Downloading"] = "Downloading";
    OllamaConnectionStatuses["Connected"] = "Connected";
})(OllamaConnectionStatuses || (OllamaConnectionStatuses = {}));
//# sourceMappingURL=utils.js.map