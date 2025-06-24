/**
 * Sorts commands with bookmarked ones first
 * @param commands The list of commands to sort
 * @param bookmarkedCommands An array of bookmarked command names
 * @returns A new sorted array with bookmarked commands first
 */
export function sortCommandsByBookmarkStatus(commands, bookmarkedCommands) {
    return [...commands].sort((a, b) => {
        const aIsBookmarked = bookmarkedCommands.includes(a.name);
        const bIsBookmarked = bookmarkedCommands.includes(b.name);
        if (aIsBookmarked && !bIsBookmarked)
            return -1;
        if (!aIsBookmarked && bIsBookmarked)
            return 1;
        return 0;
    });
}
//# sourceMappingURL=utils.js.map