export var LocalStorageKey;
(function (LocalStorageKey) {
    LocalStorageKey["IsExploreDialogOpen"] = "isExploreDialogOpen";
    LocalStorageKey["HasDismissedExploreDialog"] = "hasDismissedExploreDialog";
})(LocalStorageKey || (LocalStorageKey = {}));
export function getLocalStorage(key) {
    const value = localStorage.getItem(key);
    if (value === null) {
        return undefined;
    }
    try {
        return JSON.parse(value);
    }
    catch (error) {
        console.error(`Error parsing ${key} from local storage. Value was ${value}\n\n`, error);
        return undefined;
    }
}
export function setLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
//# sourceMappingURL=localStorage.js.map