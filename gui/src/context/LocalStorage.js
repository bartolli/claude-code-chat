import React, { createContext, useContext, useEffect, useState } from "react";
import { getLocalStorage } from "../util/localStorage";
const DEFAULT_LOCAL_STORAGE = {
    fontSize: 14,
};
const LocalStorageContext = createContext(DEFAULT_LOCAL_STORAGE);
export const LocalStorageProvider = ({ children, }) => {
    const [values, setValues] = useState(DEFAULT_LOCAL_STORAGE);
    // TODO setvalue
    useEffect(() => {
        const isJetbrains = getLocalStorage("ide") === "jetbrains";
        let fontSize = getLocalStorage("fontSize") ?? (isJetbrains ? 15 : 14);
        setValues({
            fontSize,
        });
    }, []);
    return (<LocalStorageContext.Provider value={values}>
      {children}
    </LocalStorageContext.Provider>);
};
export const useLocalStorage = () => {
    const context = useContext(LocalStorageContext);
    return context;
};
//# sourceMappingURL=LocalStorage.js.map