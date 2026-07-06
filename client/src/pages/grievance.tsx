import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LEGAL_CONFIG, formatRegisteredOffice } from "@shared/legal-config";
import { Link } from "wouter";
import { myAccountHref } from "@/lib/account-routes";

const SECTIONS = [
  { id: "corporate", title: (lang: "en" | "kn") => (lang === "kn" ? "ಕಂಪನಿ ವಿವರ" : "Corporate disclosure") },
  { id: "officer", title: (lang: "en" | "kn") => (lang === "kn" ? "ದೂರು ಪರಿಹಾರಾಧಿಕಾರಿ" : "Grievance Officer") },
  { id: "raise", title: (lang: "en" | "kn") => (lang === "kn" ? "ನೀವು ಏನು ದೂರು ಸಲ್ಲಿಸಬಹುದು" : "What you can raise") },
  { id: "subprocessors", title: (lang: "en" | "kn") => (lang === "kn" ? "ಉಪಪ್ರಕ್ರಿಯೆದಾರರು" : "Subprocessors") },
  { id: "response", title: (lang: "en" | "kn") => (lang === "kn" ? "ಪ್ರತಿಕ್ರಿಯೆ ಮಾನದಂಡ" : "Response standard") },
  { id: "withdrawal", title: (lang: "en" | "kn") => (lang === "kn" ? "ಸಮ್ಮತಿ ಹಿಂತೆಗೆದುಕೊಳ್ಳುವಿಕೆ" : "Consent withdrawal") },
  { id: "escalation", title: (lang: "en" | "kn") => (lang === "kn" ? "ಮೇಲ್ಮನವಿ" : "Escalation") },
];

export default function GrievancePage() {
  const { grievanceOfficer, responseStandard } = LEGAL_CONFIG;
  return (
    <LegalPageLayout
      title={(lang) => (lang === "kn" ? "ದೂರು ಪರಿಹಾರ" : "Grievance Redressal")}
      subtitle={(lang) =>
        lang === "kn"
          ? "ಅಧಿಕಾರಿ ವಿವರ, ಪ್ರತಿಕ್ರಿಯೆ ಮಾನದಂಡಗಳು ಮತ್ತು ಸಮ್ಮತಿ ಹಿಂತೆಗೆದುಕೊಳ್ಳುವಿಕೆ"
          : "Officer disclosure, response standards, and consent withdrawal"
      }
      sections={SECTIONS}
      showLanguageToggle
    >
      {(lang) => (
        <>
          <section id="corporate">
            <h2>{lang === "kn" ? "ಕಂಪನಿ ವಿವರ" : "Corporate disclosure"}</h2>
            <ul>
              <li>
                <strong>{lang === "kn" ? "ಕಂಪನಿ ಹೆಸರು:" : "Company name:"}</strong>{" "}
                {LEGAL_CONFIG.companyLegalName}
              </li>
              <li>
                <strong>{lang === "kn" ? "ನೋಂದಾಯಿತ ಕಚೇರಿ:" : "Registered office:"}</strong>{" "}
                {formatRegisteredOffice()}
              </li>
              <li>
                <strong>{lang === "kn" ? "ಸಿಐಎನ್:" : "CIN:"}</strong> {LEGAL_CONFIG.cin}
              </li>
              <li>
                <strong>{lang === "kn" ? "ವೇದಿಕೆ:" : "Platform:"}</strong>{" "}
                {LEGAL_CONFIG.platformUrl.replace("https://", "")}
              </li>
            </ul>
          </section>

          <section id="officer">
            <h2>{lang === "kn" ? "ಡೇಟಾ ಪ್ರೊಟೆಕ್ಷನ್ ಮತ್ತು ದೂರು ಪರಿಹಾರಾಧಿಕಾರಿ" : "Data Protection and Grievance Officer"}</h2>
            <ul>
              <li>
                <strong>{lang === "kn" ? "ಹೆಸರು:" : "Name:"}</strong> {grievanceOfficer.name}
              </li>
              <li>
                <strong>{lang === "kn" ? "ಹುದ್ದೆ:" : "Designation:"}</strong>{" "}
                {grievanceOfficer.designation}
              </li>
              <li>
                <strong>{lang === "kn" ? "ಅಧಿಕೃತ ಇಮೇಲ್:" : "Official email:"}</strong>{" "}
                <a href={`mailto:${grievanceOfficer.email}`} className="text-primary underline">
                  {grievanceOfficer.email}
                </a>
              </li>
              <li>
                <strong>{lang === "kn" ? "ಅಂಚೆ ವಿಳಾಸ:" : "Postal address:"}</strong>{" "}
                {lang === "kn" ? "ನೋಂದಾಯಿತ ಕಚೇರಿಯಂತೆಯೇ" : "same as registered office"}
              </li>
              <li>
                <strong>{lang === "kn" ? "ಗ್ರಾಹಕ ಸಂರಕ್ಷಣೆ:" : "Customer care:"}</strong>{" "}
                {LEGAL_CONFIG.customerCare.phone} ({LEGAL_CONFIG.customerCare.hours})
              </li>
            </ul>
          </section>

          <section id="raise">
            <h2>{lang === "kn" ? "ನೀವು ಏನು ದೂರು ಸಲ್ಲಿಸಬಹುದು" : "What you can raise here"}</h2>
            <ul>
              <li>
                {lang === "kn"
                  ? "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ, ಆರೋಗ್ಯ ಮಾಹಿತಿ ಸೇರಿದಂತೆ, ಹೇಗೆ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ, ಬಳಸಲಾಗುತ್ತದೆ ಅಥವಾ ಹಂಚಲಾಗುತ್ತದೆ ಎಂಬುದರ ಕುರಿತು ಪ್ರಶ್ನೆಗಳು."
                  : "Questions about how your personal data, including health data, is collected, used, or shared."}
              </li>
              <li>
                {lang === "kn"
                  ? "ನಿಮ್ಮ ಡೇಟಾ ಪ್ರಿನ್ಸಿಪಲ್ ಹಕ್ಕುಗಳ ನೀತಿಯಲ್ಲಿ ವಿವರಿಸಿದಂತೆ ಪ್ರವೇಶ, ತಿದ್ದುಪಡಿ, ಅಳಿಸುವಿಕೆ ಅಥವಾ ನಾಮನಿರ್ದೇಶನ ವಿನಂತಿಗಳು."
                  : "Requests to access, correct, or erase your data, or to register a nominee, as described in our Data Principal Rights Policy."}
              </li>
              <li>
                {lang === "kn"
                  ? "ವಿನಂತಿಯನ್ನು ಹೇಗೆ ನಿರ್ವಹಿಸಲಾಯಿತು ಅಥವಾ ಗೌಪ್ಯತೆ/ಭದ್ರತಾ ಅಭ್ಯಾಸಗಳ ಬಗ್ಗೆ ದೂರುಗಳು."
                  : "Complaints about how a request was handled, or about privacy or security practices."}
              </li>
              <li>
                {lang === "kn"
                  ? "ನಿಮ್ಮ ಖಾತೆಗೆ ಅನಧಿಕೃತ ಪ್ರವೇಶ ಅಥವಾ ಸಂಶಯಾಸ್ಪದ ಚಟುವಟಿಕೆಯ ವರದಿಗಳು."
                  : "Reports of suspected unauthorised access to your account or suspicious activity."}
              </li>
            </ul>
          </section>

          <section id="subprocessors">
            <h2>{lang === "kn" ? "ಉಪಪ್ರಕ್ರಿಯೆದಾರ ಪಟ್ಟಿ" : "Subprocessor schedule"}</h2>
            <p>
              {lang === "kn" ? (
                <>
                  ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಸಂಸ್ಕರಿಸುವ ಉಪಪ್ರಕ್ರಿಯೆದಾರರು — Railway Corp. (ಇಂಟರಿಮ್ ಹೋಸ್ಟಿಂಗ್), Razorpay,
                  ಮತ್ತು Google ಸೇರಿದಂತೆ — ನಮ್ಮ{" "}
                  <Link href="/privacy#subprocessors" className="text-primary underline">
                    ಗೌಪ್ಯತಾ ಸೂಚನೆಯಲ್ಲಿ
                  </Link>{" "}
                  ಪಟ್ಟಿ ಮಾಡಲಾಗಿದೆ. ಸ್ಥಳೀಕರಣ ಮತ್ತು ಇಂಟರಿಮ್ ಹೋಸ್ಟಿಂಗ್ ಬಗ್ಗೆ{" "}
                  <Link href="/privacy#localisation" className="text-primary underline">
                    ಸ್ಥಳೀಕರಣ ವಿಭಾಗ
                  </Link>
                  {" "}ಅನ್ನು ನೋಡಿ.
                </>
              ) : (
                <>
                  Subprocessors that process personal data on our instructions — including Railway Corp. (interim
                  hosting), Razorpay, and Google — are listed in our{" "}
                  <Link href="/privacy#subprocessors" className="text-primary underline">
                    Privacy Notice
                  </Link>
                  . For interim hosting and data localisation, see the{" "}
                  <Link href="/privacy#localisation" className="text-primary underline">
                    Data localisation
                  </Link>{" "}
                  section.
                </>
              )}
            </p>
          </section>

          <section id="response">
            <h2>{lang === "kn" ? "ನಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ ಮಾನದಂಡ" : "Our response standard"}</h2>
            <p>
              {lang === "kn"
                ? `ದೂರು ಸ್ವೀಕರಿಸಿದ ${responseStandard.acknowledgmentHours} ಗಂಟೆಗಳೊಳಗೆ ನಾವು ಅಂಗೀಕಾರಿಸುತ್ತೇವೆ ಮತ್ತು ${responseStandard.resolutionDays} ದಿನಗಳೊಳಗೆ ಪರಿಹಾರಿಸಲು ಪ್ರಯತ್ನಿಸುತ್ತೇವೆ. ಇದು ಡಿಪಿಡಿಪಿ ನಿಯಮಗಳು, 2025 ರಡಿಯಲ್ಲಿ ಅನುಮತಿಸಲಾದ ಗರಿಷ್ಠ ${responseStandard.statutoryMaxDays} ದಿನಗಳಿಗಿಂತ ವೇಗವಾದ ಸ್ವಯಂಪ್ರೇರಿತ ಮಾನದಂಡ. ವಿಷಯಕ್ಕೆ ಹೆಚ್ಚು ಸಮಯ ಬೇಕಾದರೆ, ನಾವು ಕಾರಣವನ್ನು ತಿಳಿಸಿ ಪರಿಷ್ಕೃತ ಸಮಯಸೀಮೆಯನ್ನು ನೀಡುತ್ತೇವೆ, ಅದು ಕಾನೂನುಬದ್ಧ ಗರಿಷ್ಠ ಮಿತಿಯನ್ನು ಮೀರುವುದಿಲ್ಲ.`
                : `We acknowledge a grievance within ${responseStandard.acknowledgmentHours} hours of receipt and aim to resolve it within ${responseStandard.resolutionDays} days. This is a voluntary standard faster than the maximum ${responseStandard.statutoryMaxDays} days permitted under the DPDP Rules, 2025. Where a matter genuinely requires more time, we will tell you why and give you a revised timeline, which will not exceed the statutory maximum.`}
            </p>
          </section>

          <section id="withdrawal">
            <h2>{lang === "kn" ? "ಸಮ್ಮತಿ ಹಿಂತೆಗೆದುಕೊಳ್ಳುವಿಕೆ ಮತ್ತು ಖಾತೆ ಅಳಿಸುವಿಕೆ" : "Consent withdrawal and account erasure"}</h2>
            <p>
              {lang === "kn" ? (
                <>
                  ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ,{" "}
                  <Link href={myAccountHref("privacy")} className="text-primary underline">
                    ಗೌಪ್ಯತೆ ಮತ್ತು ಸಮ್ಮತಿ ನಿರ್ವಹಣೆ
                  </Link>{" "}
                  ವಿಭಾಗದಲ್ಲಿ, ನೀವು ಸಮ್ಮತಿಯನ್ನು ಹಿಂತೆಗೆದುಕೊಂಡು ಖಾತೆ ಮುಚ್ಚುವಿಕೆಯನ್ನು ವಿನಂತಿಸಬಹುದು. ನಾವು ಸಂಸ್ಕರಿಸುವ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ ಮೂಲ ಖಾತೆ, ಬುಕ್ಕಿಂಗ್ ಮತ್ತು ಭದ್ರತಾ ಕಾರ್ಯಗಳಿಗೆ ಅಗತ್ಯವಿರುವುದರಿಂದ, ಸಮ್ಮತಿ ಹಿಂತೆಗೆದುಕೊಳ್ಳುವುದು ಮತ್ತು ಖಾತೆ ಮುಚ್ಚುವುದು ಒಟ್ಟಿಗೆ ನಡೆಯುತ್ತದೆ.
                </>
              ) : (
                <>
                  Inside Account Settings, under{" "}
                  <Link href={myAccountHref("privacy")} className="text-primary underline">
                    Privacy and Consent Management
                  </Link>
                  , you can withdraw consent and request closure of your account. Because the personal data we
                  process is necessary for core account, booking, and security functions, withdrawing consent and
                  closing your account happen together.
                </>
              )}
            </p>
            <p>{lang === "kn" ? "ಸಮ್ಮತಿ ಹಿಂತೆಗೆದುಕೊಂಡು ಖಾತೆಯನ್ನು ಅಳಿಸುವುದರಿಂದ:" : "Withdrawing consent and erasing your account will:"}</p>
            <ul>
              <li>
                {lang === "kn"
                  ? "ಸಕ್ರಿಯ ಅಥವಾ ಮುಂದಿನ ಬುಕ್ಕಿಂಗ್‌ಗಳನ್ನು ತಕ್ಷಣ ರದ್ದುಗೊಳಿಸಲಾಗುತ್ತದೆ."
                  : "Immediately cancel any active or upcoming bookings."}
              </li>
              <li>
                {lang === "kn"
                  ? "ನಮ್ಮ ಡೇಟಾ ರಿಟೆನ್ಷನ್ ಮತ್ತು ಇರೇಜರ್ ಪಾಲಿಸಿಯಲ್ಲಿ ವಿವರಿಸಿದಂತೆ ಮுப்பತ್ತು ದಿನಗಳೊಳಗೆ ಗುರುತು ಮತ್ತು ಆರೋಗ್ಯ ಮಾಹಿತಿಯ ಅಳಿಸುವಿಕೆ ಅಥವಾ ಅನಾಮಧೇಯಗೊಳಿಸುವಿಕೆ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ."
                  : "Trigger erasure or anonymisation of Identity Data and Health Data within 30 days, as described in our Data Retention and Erasure Policy."}
              </li>
              <li>
                {lang === "kn"
                  ? "ಕಾನೂನುಬದ್ಧವಾಗಿ ಅಗತ್ಯವಿರುವ ಸೀಮಿತ ವರ್ಗಗಳನ್ನು ಮಾತ್ರ ಉಳಿಸಲಾಗುತ್ತದೆ (ಪ್ರಕ್ರಿಯಾ ಲಾಗ್‌ಗಳು ಮತ್ತು ಹಣಕಾಸು ದಾಖಲೆಗಳು), ಸಕ್ರಿಯ ಮಾರುಕಟ್ಟೆ ಅಥವಾ ಪ್ರೊಫೈಲ್ ವ್ಯವಸ್ಥೆಗಳಿಂದ ಪ್ರತ್ಯೇಕವಾಗಿ."
                  : "Retain only limited categories legally required (processing logs and financial records), kept isolated from active marketing or profile systems."}
              </li>
            </ul>
            <p>
              {lang === "kn"
                ? "ಆರೋಗ್ಯ ಮಾಹಿತಿ ಸಮ್ಮತಿಯನ್ನು ಖಾತೆ ಮುಚ್ಚದೆ ಪ್ರತ್ಯೇಕವಾಗಿ ಹಿಂತೆಗೆದುಕೊಳ್ಳಬಹುದು. ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿನ ಗೌಪ್ಯತೆ ಮತ್ತು ಸಮ್ಮತಿ ನಿರ್ವಹಣೆಯನ್ನು ನೋಡಿ."
                : "Health data consent may be withdrawn independently without closing your account. See Privacy and Consent Management in your account."}
            </p>
          </section>

          <section id="escalation">
            <h2>
              {lang === "kn"
                ? "ಆಂಡ್‌ವೀಯೋಗದ ಹೊರಗೆ ಮೇಲ್ಮನವಿ"
                : `Escalation beyond ${LEGAL_CONFIG.brandName}`}
            </h2>
            <p>
              {lang === "kn"
                ? `ನಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆಯಿಂದ ನೀವು ತೃಪ್ತರಾಗದಿದ್ದರೆ, ${LEGAL_CONFIG.dataProtectionBoard.name} ಅಥವಾ ಉಪಭೋಕ್ತಾ ರಕ್ಷಣಾ ಕಾಯಿದೆ, 2019 ರ ಅನುಸಾರ ಸಂಬಂಧಿತ ಉಪಭೋಕ್ತಾ ವೇದಿಕೆಗೆ ಮೇಲ್ಮನವಿ ಸಲ್ಲಿಸಬಹುದು. ಮೊದಲು ನಮ್ಮ ಬಳಿ ದೂರು ಸಲ್ಲಿಸುವುದು ಶಿಫಾರಸು ಮಾಡಲಾಗುತ್ತದೆ, ಆದರೆ ಅದು ಮುನ್ನ ಶರತ್ತು ಅಲ್ಲ.`
                : `If you are not satisfied with our response, you may escalate to the ${LEGAL_CONFIG.dataProtectionBoard.name}, or to the appropriate consumer forum under the Consumer Protection Act, 2019. Raising a grievance with us first is recommended but is not a precondition.`}
            </p>
          </section>
        </>
      )}
    </LegalPageLayout>
  );
}
