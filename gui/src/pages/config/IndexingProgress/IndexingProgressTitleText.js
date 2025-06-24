import { AnimatedEllipsis } from "../../../components";
const STATUS_TO_TEXT = {
    done: "Indexing complete",
    loading: "Initializing",
    indexing: "Indexing in-progress",
    paused: "Indexing paused",
    failed: "Indexing failed",
    disabled: "Indexing disabled",
    cancelled: "Indexing cancelled",
};
function IndexingProgressTitleText({ update }) {
    const showEllipsis = update.status === "loading";
    return (<span>
      {STATUS_TO_TEXT[update.status]}
      {showEllipsis && <AnimatedEllipsis />}
    </span>);
}
export default IndexingProgressTitleText;
//# sourceMappingURL=IndexingProgressTitleText.js.map