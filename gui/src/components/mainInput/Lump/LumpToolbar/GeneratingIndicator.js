import { AnimatedEllipsis } from "../../..";
export function GeneratingIndicator({ text = "Generating", testId, }) {
    return (<div className="text-description-muted text-xs" data-testid={testId}>
      <span>{text}</span>
      <AnimatedEllipsis />
    </div>);
}
//# sourceMappingURL=GeneratingIndicator.js.map