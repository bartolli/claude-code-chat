import React, { createContext, useContext, useEffect, useRef, useState, } from "react";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { setMainEditorContentTrigger } from "../../../redux/slices/sessionSlice";
import { useMainEditorWebviewListeners } from "./useMainEditorWebviewListeners";
const initialState = {
    mainEditor: null,
    setMainEditor: () => { },
    inputId: null,
    setInputId: () => { },
    onEnterRef: { current: () => { } },
};
const MainEditorContext = createContext(initialState);
/**
 * Provider component that maintains a reference to the main editor
 */
export const MainEditorProvider = ({ children, }) => {
    const dispatch = useAppDispatch();
    const [mainEditor, setMainEditorInternal] = useState(initialState.mainEditor);
    const [inputId, setInputId] = useState(initialState.inputId);
    const onEnterRef = useRef(() => { });
    const editorFocusedRef = useRef(false);
    const historyLength = useAppSelector((store) => store.session.history.length);
    // Listen for changes to mainEditorContentTrigger in Redux
    const mainEditorContentTrigger = useAppSelector((store) => store.session.mainEditorContentTrigger);
    useEffect(() => {
        if (mainEditor && mainEditorContentTrigger) {
            queueMicrotask(() => {
                mainEditor.commands.setContent(mainEditorContentTrigger);
            });
            // Clear the trigger after using it
            dispatch(setMainEditorContentTrigger(undefined));
        }
    }, [mainEditor, mainEditorContentTrigger, dispatch]);
    // Update focused ref when editor focus state changes
    useEffect(() => {
        if (mainEditor) {
            const updateFocus = () => {
                editorFocusedRef.current = mainEditor.isFocused || false;
            };
            mainEditor.on("focus", updateFocus);
            mainEditor.on("blur", updateFocus);
            return () => {
                mainEditor.off("focus", updateFocus);
                mainEditor.off("blur", updateFocus);
            };
        }
    }, [mainEditor]);
    // Set up main editor webview listeners when we have a valid editor and input ID
    useMainEditorWebviewListeners({
        editor: mainEditor,
        onEnterRef,
        dispatch,
        historyLength,
        inputId: inputId || "",
        editorFocusedRef,
    });
    const setMainEditor = (newEditor) => {
        setMainEditorInternal(newEditor);
    };
    const value = {
        mainEditor,
        setMainEditor,
        inputId,
        setInputId,
        onEnterRef,
    };
    return (<MainEditorContext.Provider value={value}>
      {children}
    </MainEditorContext.Provider>);
};
/**
 * Hook to access the main editor context
 */
export const useMainEditor = () => useContext(MainEditorContext);
//# sourceMappingURL=MainEditorProvider.js.map