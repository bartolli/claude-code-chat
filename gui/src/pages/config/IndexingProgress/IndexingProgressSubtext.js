const STATUS_TO_SUBTITLE_TEXT = {
    done: "Click to re-index",
    loading: "",
    indexing: "Click to pause",
    paused: "Click to resume",
    failed: "Click to retry",
    disabled: "Click to open assistant configuration",
    cancelled: "Click to restart",
};
function IndexingProgressSubtext({ update, onClick, }) {
    const showIndexingDesc = update.status === "indexing";
    return (<div className="flex justify-between">
      <span className={`text-lightgray inline-block cursor-pointer text-xs underline`} onClick={onClick}>
        {STATUS_TO_SUBTITLE_TEXT[update.status]}
      </span>

      <div className={`${showIndexingDesc ? "w-2/3" : "flex-1"}`}>
        {showIndexingDesc && (<span className="text-lightgray block truncate text-right text-xs">
            {update.desc}
          </span>)}
      </div>
    </div>);
}
export default IndexingProgressSubtext;
//# sourceMappingURL=IndexingProgressSubtext.js.map