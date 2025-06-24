import { getLocalStorage, setLocalStorage } from "./localStorage";
export const FREE_TRIAL_LIMIT_REQUESTS = 50;
export function hasPassedFTL() {
    return (getLocalStorage("ftc") ?? 0) > FREE_TRIAL_LIMIT_REQUESTS;
}
export function incrementFreeTrialCount() {
    const u = getLocalStorage("ftc") ?? 0;
    setLocalStorage("ftc", u + 1);
    return u + 1;
}
//# sourceMappingURL=freeTrial.js.map