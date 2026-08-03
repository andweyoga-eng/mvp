import { ConsentCheckbox } from "@/components/consent-checkbox";
import {
  CANCELLATION_POLICY_CLICKWRAP_COPY,
  CANCELLATION_POLICY_PATH,
} from "@shared/cancellation-policy";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
  className?: string;
};

/** Mandatory affirmative clickwrap for Cancellation/Refund Policy v2.0 (FR-A18). */
export function CancellationPolicyClickwrap({
  checked,
  onChange,
  testId = "accept-cancellation-policy",
  className,
}: Props) {
  const copy = CANCELLATION_POLICY_CLICKWRAP_COPY.en;
  return (
    <ConsentCheckbox
      testId={testId}
      checked={checked}
      onChange={onChange}
      className={className}
      label={
        <span>
          I have read and agree to the{" "}
          <a
            href={CANCELLATION_POLICY_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 text-primary font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {copy.linkLabel}
          </a>
          .
        </span>
      }
    />
  );
}
