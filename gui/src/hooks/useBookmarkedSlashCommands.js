import { usePostHog } from "posthog-js/react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { bookmarkSlashCommand, selectBookmarkedSlashCommands, unbookmarkSlashCommand, } from "../redux/slices/profilesSlice";
export function useBookmarkedSlashCommands() {
    const dispatch = useAppDispatch();
    const posthog = usePostHog();
    const bookmarkedCommands = useAppSelector(selectBookmarkedSlashCommands);
    const isCommandBookmarked = (commandName) => {
        return bookmarkedCommands.includes(commandName);
    };
    const toggleBookmark = (command) => {
        const isBookmarked = isCommandBookmarked(command.name);
        posthog.capture("toggle_bookmarked_slash_command", {
            isBookmarked,
        });
        if (isBookmarked) {
            dispatch(unbookmarkSlashCommand({
                commandName: command.name,
            }));
        }
        else {
            dispatch(bookmarkSlashCommand({
                commandName: command.name,
            }));
        }
    };
    return {
        isCommandBookmarked,
        toggleBookmark,
    };
}
//# sourceMappingURL=useBookmarkedSlashCommands.js.map