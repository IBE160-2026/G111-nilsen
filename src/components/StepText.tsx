import { Fragment } from "react";
import type { Step } from "@/domain";
import { appliedSuggestionMessages as m } from "@/lib/messages";
import SuggestedBadge from "./SuggestedBadge";
import styles from "./StepText.module.css";

function Added({ text }: { text: string }) {
  return (
    <mark className={styles.added} data-suggested="">
      <span className="visually-hidden">{m.inlinePrefix}</span> {text}
    </mark>
  );
}

/**
 * Stegteksten med forslag som er flettet inn (Story 5.12), uthevet og lest opp som «Forslag:».
 * Et steg som i sin helhet er et forslag får merket «Forslag».
 */
export default function StepText({ step }: { step: Step }) {
  return (
    <>
      {(step.addedBefore ?? []).map((text) => (
        <Fragment key={`før-${text}`}>
          <Added text={text} />{" "}
        </Fragment>
      ))}
      {step.text}
      {(step.addedAfter ?? []).map((text) => (
        <Fragment key={`etter-${text}`}>
          {" "}
          <Added text={text} />
        </Fragment>
      ))}
      {step.suggested ? (
        <>
          {" "}
          <SuggestedBadge />
        </>
      ) : null}
    </>
  );
}
