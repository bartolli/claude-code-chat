import { ListboxButton as HLButton, ListboxOption as HLOption, ListboxOptions as HLOptions, Listbox, } from "@headlessui/react";
import * as React from "react";
import { defaultBorderRadius, vscCommandCenterInactiveBorder } from "..";
import { cn } from "../../util/cn";
import { useFontSize } from "./font";
const ListboxButton = React.forwardRef(({ fontSizeModifier = -3, ...props }, ref) => {
    const fontSize = useFontSize(fontSizeModifier);
    return (<HLButton ref={ref} {...props} className={cn("bg-vsc-input-background text-vsc-foreground border-border m-0 flex flex-1 cursor-pointer flex-row items-center gap-1 border border-solid px-1 py-0.5 text-left transition-colors duration-200", props.className)} style={{
            fontSize,
            borderRadius: defaultBorderRadius,
            ...props.style,
        }}/>);
});
const ListboxOptions = React.forwardRef(({ fontSizeModifier = -3, ...props }, ref) => {
    const fontSize = useFontSize(fontSizeModifier);
    return (<HLOptions ref={ref} anchor={"bottom start"} {...props} className={cn("bg-vsc-input-background flex w-max min-w-[160px] max-w-[400px] flex-col overflow-auto px-0 shadow-md", props.className)} style={{
            border: `1px solid ${vscCommandCenterInactiveBorder}`,
            fontSize,
            borderRadius: defaultBorderRadius,
            zIndex: 200000,
            ...props.style,
        }}/>);
});
const ListboxOption = React.forwardRef(({ fontSizeModifier = -3, ...props }, ref) => {
    const fontSize = useFontSize(fontSizeModifier);
    return (<HLOption ref={ref} {...props} className={cn("text-foreground flex select-none flex-row items-center justify-between px-2 py-1", props.disabled
            ? "opacity-50"
            : "background-transparent hover:bg-list-active hover:text-list-active-foreground cursor-pointer opacity-100", props.className)} style={{
            fontSize,
            ...props.style,
        }}/>);
});
export { Listbox, ListboxButton, ListboxOption, ListboxOptions };
//# sourceMappingURL=Listbox.js.map