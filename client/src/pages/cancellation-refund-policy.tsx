import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LEGAL_CONFIG, formatRegisteredOffice } from "@shared/legal-config";
import {
  CANCELLATION_POLICY_ARCHIVE,
  CANCELLATION_POLICY_EFFECTIVE_DATE,
  CANCELLATION_POLICY_VERSION,
  RESCHEDULE_WINDOW_DAYS,
} from "@shared/cancellation-policy";
import { Link } from "wouter";

const SECTIONS = [
  { id: "scope", title: () => "Scope" },
  { id: "user-cancel", title: () => "Cancellation by the user" },
  { id: "platform-cancel", title: () => "Cancellation by instructor or platform" },
  { id: "reschedule", title: () => "Reschedule" },
  { id: "refund", title: () => "Refund" },
  { id: "guests", title: () => "Guests" },
  { id: "versions", title: () => "Versions" },
  { id: "grievance", title: () => "Grievance" },
];

export default function CancellationRefundPolicyPage() {
  return (
    <LegalPageLayout
      title={() => "Cancellation, Refund and Rescheduling Policy"}
      subtitle={() => `Version ${CANCELLATION_POLICY_VERSION} · Effective ${CANCELLATION_POLICY_EFFECTIVE_DATE}`}
      sections={SECTIONS}
    >
      {() => (
        <>
          <section id="scope">
            <h2>Scope</h2>
            <p>
              This Policy forms part of the Terms of Service of {LEGAL_CONFIG.brandName}, operated by{" "}
              {LEGAL_CONFIG.companyLegalName} (registered office: {formatRegisteredOffice()}). It
              governs cancellation, rescheduling, and refunds for Sessions and Programs booked through
              the platform. Where a session-level notice conflicts with this Policy, this Policy
              prevails.
            </p>
          </section>

          <section id="user-cancel">
            <h2>Cancellation or non-attendance by the user</h2>
            <p>
              Where a Registered User or Guest cancels a booking, fails to attend, or does not join a
              booked Session for any reason attributable to the User, the Fees for that Session are
              forfeited in full. The platform does not offer voluntary rescheduling of a Session the
              User is able to attend.
            </p>
          </section>

          <section id="platform-cancel">
            <h2>Cancellation by the instructor or platform</h2>
            <p>
              Where a booked Session is not delivered owing to instructor unavailability, suspension,
              or platform cancellation, the value is retained for the Registered User as a
              Reschedulable Entitlement. Guests are entitled to a full refund to source (they purchase
              trial or drop-in only).
            </p>
          </section>

          <section id="reschedule">
            <h2>Reschedule</h2>
            <p>
              Eligible targets are the same class type, any instructor, with free capacity, inside the
              Program Period extended to at least {RESCHEDULE_WINDOW_DAYS} days after the
              cancellation (deadline = the later of cancel + {RESCHEDULE_WINDOW_DAYS} days and the
              Program horizon end).
            </p>
          </section>

          <section id="refund">
            <h2>Refund on non-reschedule</h2>
            <p>
              If Reschedulable Entitlement remains at the deadline, the platform issues a proportionate
              refund to source using the contractual per-session allocation frozen at purchase
              (8 decimal places internally; rounded to 2 decimal places at refund). There is no credit
              wallet. Gateway fees retained by the payment provider are absorbed by the platform.
            </p>
          </section>

          <section id="guests">
            <h2>Guests</h2>
            <p>
              Guest checkout is limited to single-session trial and drop-in Programs. Platform
              cancellation of a paid guest booking triggers a full refund to source, subject to
              provider settlement timelines.
            </p>
          </section>

          <section id="versions">
            <h2>Versions</h2>
            <p>
              Historic policy versions are archived and never overwritten. A booking is governed by
              the version accepted at purchase (stored with timestamp).
            </p>
            <ul>
              {CANCELLATION_POLICY_ARCHIVE.map((entry) => (
                <li key={entry.version}>
                  <strong>{entry.version}</strong> - effective {entry.effectiveDate}
                  {entry.supersededAt ? ` (superseded ${entry.supersededAt})` : " (current)"}
                </li>
              ))}
            </ul>
          </section>

          <section id="grievance">
            <h2>Grievance Officer</h2>
            <p>
              Mudit Arun - mudit@andweyoga.com - 221 2nd Floor SV Meadows Apartment, Kodipalya,
              Bengaluru 560060. See also the{" "}
              <Link href="/grievance" className="underline">
                Grievance page
              </Link>
              .
            </p>
          </section>
        </>
      )}
    </LegalPageLayout>
  );
}
