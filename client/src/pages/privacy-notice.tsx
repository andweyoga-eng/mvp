import { LegalPageLayout, SensitiveDataCallout } from "@/components/legal/legal-page-layout";
import { LEGAL_CONFIG, formatRegisteredOffice } from "@shared/legal-config";
import { CUSTOMER_SUPPORT } from "@shared/support";
import { Link } from "wouter";

const SECTIONS = [
  { id: "who", title: (lang: "en" | "kn") => (lang === "kn" ? "ನಾವು ಯಾರು" : "Who we are") },
  { id: "data", title: (lang: "en" | "kn") => (lang === "kn" ? "ಸಂಗ್ರಹಿಸುವ ಮಾಹಿತಿ" : "Data we collect") },
  { id: "not", title: (lang: "en" | "kn") => (lang === "kn" ? "ನಾವು ಮಾಡುವುದಿಲ್ಲ" : "What we do not do") },
  { id: "consent", title: (lang: "en" | "kn") => (lang === "kn" ? "ಸಮ್ಮತಿ" : "Consent") },
  { id: "adults", title: (lang: "en" | "kn") => (lang === "kn" ? "ವಯಸ್ಕರಿಗಷ್ಟೇ" : "Adults-only") },
  { id: "payments", title: (lang: "en" | "kn") => (lang === "kn" ? "ಪಾವತಿಗಳು" : "Razorpay") },
  { id: "localisation", title: (lang: "en" | "kn") => (lang === "kn" ? "ಸ್ಥಳೀಕರಣ" : "Localisation") },
  { id: "rights", title: (lang: "en" | "kn") => (lang === "kn" ? "ನಿಮ್ಮ ಹಕ್ಕುಗಳು" : "Your rights") },
  { id: "contact", title: (lang: "en" | "kn") => (lang === "kn" ? "ಸಂಪರ್ಕ" : "Contact") },
];

export default function PrivacyNoticePage() {
  const email = LEGAL_CONFIG.grievanceOfficer.email;
  return (
    <LegalPageLayout
      title={(lang) => (lang === "kn" ? "ಗೌಪ್ಯತಾ ಸೂಚನೆ" : "Privacy Notice")}
      subtitle={(lang) =>
        lang === "kn"
          ? "ಅಷ್ಟಾಂಗ ವೆಲ್‌ಟೆಕ್ ಓಪಿಸಿ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್ ನಡೆಸುವ ಆಂಡ್‌ವೀಯೋಗ ವೇದಿಕೆಯ ಗೌಪ್ಯತಾ ಮಾಹಿತಿ"
          : `${LEGAL_CONFIG.companyLegalName}, operating ${LEGAL_CONFIG.brandName}`
      }
      sections={SECTIONS}
      showLanguageToggle
    >
      {(lang) => (
        <>
      <section id="who">
        <h2>{lang === "kn" ? "ನಾವು ಯಾರು ಮತ್ತು ಈ ಸೂಚನೆ ಯಾವ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿದೆ" : "Who we are and what this notice covers"}</h2>
        <p>
          {lang === "kn"
            ? "ಅಷ್ಟಾಂಗ ವೆಲ್‌ಟೆಕ್ ಓಪಿಸಿ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್ ನಡೆಸುವ ಆಂಡ್‌ವೀಯೋಗ ವೇದಿಕೆ ಡಿಜಿಟಲ್ ಪರ್ಸನಲ್ ಡೇಟಾ ಪ್ರೊಟೆಕ್ಷನ್ ಕಾಯಿದೆ, 2023, ಮಾಹಿತಿ ತಂತ್ರಜ್ಞಾನ ಕಾಯಿದೆ, 2000 ಮತ್ತು ಸಂಬಂಧಿತ ನಿಯಮಗಳ ಅನುಸಾರ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸಿ ಸಂಸ್ಕರಿಸುತ್ತದೆ. ನಾವು ಯಾವ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸುತ್ತೇವೆ, ಏಕೆ ಸಂಗ್ರಹಿಸುತ್ತೇವೆ ಮತ್ತು ನಿಮಗೆ ಇರುವ ಹಕ್ಕುಗಳು ಯಾವುವು ಎಂಬುದನ್ನು ಈ ಸೂಚನೆ ವಿವರಿಸುತ್ತದೆ."
            : `${LEGAL_CONFIG.companyLegalName} (“the Company”, “We”, “Us”, “Our”), operating the platform ${LEGAL_CONFIG.brandName}, collects and processes personal data in accordance with the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000, and the rules made under each. This notice describes what personal data we collect, why we collect it, and what rights you hold over it.`}
        </p>
        <p>
          {lang === "kn"
            ? "ನಮ್ಮ ಯೋಗ ಅನ್ವೇಷಣೆ, ಬುಕ್ಕಿಂಗ್ ಮತ್ತು ಆರೋಗ್ಯಸಂಬಂಧಿತ ಸಮನ್ವಯ ಸೇವೆಗಳನ್ನು ನೀಡಲು ಅಗತ್ಯವಿರುವ ಮಾಹಿತಿಯನ್ನು ಮಾತ್ರ ನಾವು ಸಂಗ್ರಹಿಸುತ್ತೇವೆ."
            : "We collect only the data necessary to provide our yoga discovery, booking, and wellness coordination services."}
        </p>
      </section>

      <section id="data">
        <h2>{lang === "kn" ? "ನಾವು ಯಾವ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸುತ್ತೇವೆ ಮತ್ತು ಏಕೆ" : "Data we collect, and why"}</h2>
        <ul>
          <li>
            <strong>{lang === "kn" ? "ಗುರುತು ವಿವರಗಳು" : "Identity Data"}</strong>
            {lang === "kn"
              ? ": ಹೆಸರು, ದೂರವಾಣಿ ಸಂಖ್ಯೆ, ಇಮೇಲ್ ವಿಳಾಸ, ನಿಮ್ಮ ಖಾತೆ ರಚನೆ, ಭದ್ರತೆ, ಬುಕ್ಕಿಂಗ್ ನಿರ್ವಹಣೆ ಮತ್ತು ಸೆಷನ್ ದೃಢೀಕರಣಗಳಿಗಾಗಿ."
              : ": name, phone number, and email address, used to create and secure your account, manage bookings, and send session confirmations."}
          </li>
          <li>
            <strong>{lang === "kn" ? "ಬುಕ್ಕಿಂಗ್ ಮತ್ತು ವೇಳಾಪಟ್ಟಿ ಮಾಹಿತಿ" : "Booking and Schedule Data"}</strong>
            {lang === "kn"
              ? ": ಆಯ್ಕೆ ಮಾಡಿದ ತರಗತಿಗಳು, ಸಮಯ ಸ್ಲಾಟ್‌ಗಳು, ಶಿಕ್ಷಕರ ಆಯ್ಕೆ, ಸೆಷನ್ ಇತಿಹಾಸ, ನಿಮ್ಮ ಕಾಯ್ದಿರింపನ್ನು ನಿರ್ವಹಿಸಲು."
              : ": selected classes, time slots, instructor choices, and session history, used to facilitate and manage your reservations."}
          </li>
          <li>
            <SensitiveDataCallout badgeLabel={lang === "kn" ? "ಸೂಕ್ಷ್ಮ" : "Sensitive"}>
              <strong>{lang === "kn" ? "ಆರೋಗ್ಯ ಮಾಹಿತಿ" : "Health Data"}</strong>
              {lang === "kn"
                ? ": ನೀವು ನೀಡುವ ಆರೋಗ್ಯ ವಿವರಗಳು ಮತ್ತು ಅಪ್‌ಲೋಡ್ ಮಾಡುವ ದಾಖಲೆಗಳು. ಅಗತ್ಯವಿರುವ ಸೆಷನ್ ಬುಕ್ ಮಾಡಿದಾಗ ಮಾತ್ರ ಮತ್ತು ಪ್ರತ್ಯೇಕ, ಸ್ಪಷ್ಟ ಸಮ್ಮತಿಯೊಂದಿಗೆ ಮಾತ್ರ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ."
                : ": health update text and documents you upload. Collected only when you book a session that requires it, and only with your separate, specific consent at the point of collection."}
            </SensitiveDataCallout>
          </li>
          <li>
            <strong>{lang === "kn" ? "ಅತಿಥಿ ಬುಕ್ಕಿಂಗ್ ಮಾಹಿತಿ" : "Guest Booking Data"}</strong>
            {lang === "kn"
              ? ": ಖಾತೆ ತೆರೆಯದೆ ಬುಕ್ ಮಾಡುವಾಗ ನೀಡುವ ಹೆಸರು, ಇಮೇಲ್, ದೂರವಾಣಿ, ಆ ಬುಕ್ಕಿಂಗ್ ದೃಢೀಕರಣ ಮತ್ತು ನಿರ್ವಹಣೆಗೆ. ಖಾತೆಯಿಲ್ಲದೆ ಅತಿಥಿ ಬುಕ್ಕಿಂಗ್ ವೇದಿಕೆಯಲ್ಲಿ ಸಕ್ರಿಯವಾಗಿರುವಾಗ ಮಾತ್ರ ಲಭ್ಯ; ನಿಷ್ಕ್ರಿಯಗೊಂಡಾಗ ಬುಕಿಂಗ್‌ಗೆ ಸೈನ್-ಇನ್ ಅಗತ್ಯ."
              : ": name, email, and phone when booking without an account, used to confirm and manage that booking. Guest checkout without an account is only available when enabled on the platform; when disabled, booking requires sign-in and member data practices apply."}
          </li>
          <li>
            <strong>{lang === "kn" ? "ಪಾವತಿ ಮಾಹಿತಿ" : "Payment Data"}</strong>
            {lang === "kn"
              ? ": ವಹಿವಾಟು ಉಲ್ಲೇಖಗಳು, ಪಾವತಿ ಸ್ಥಿತಿ, ಮೊತ್ತಗಳು. ಕಾರ್ಡ್, ಯುಪಿಐ ಅಥವಾ ನೆಟ್‌ಬ್ಯಾಂಕಿಂಗ್ ವಿವರಗಳನ್ನು ರೇಜರ್‌ಪೇ ನೇರವಾಗಿ ಸಂಗ್ರಹಿಸುತ್ತದೆ; ನಾವು ಅವನ್ನು ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ."
              : ": transaction references, payment status, and amounts. Card, UPI, or net banking details are collected directly by Razorpay and are not stored by us."}
          </li>
          <li>
            <strong>{lang === "kn" ? "ಸಾಧನ ಮತ್ತು ಲಾಗ್ ಮಾಹಿತಿ" : "Device and Log Data"}</strong>
            {lang === "kn"
              ? ": ಐಪಿ ವಿಳಾಸ, ಪ್ರವೇಶ ಸಮಯದ ದಾಖಲೆಗಳು, ಸಾಧನ ಮತ್ತು ಬ್ರೌಸರ್ ಮಾಹಿತಿ, ವಂಚನೆ ತಡೆ, ವೇದಿಕೆಯ ಭದ್ರತೆ ಮತ್ತು ಕಾನೂನುಬದ್ಧ ಲಾಗ್ ಅಗತ್ಯಗಳಿಗಾಗಿ."
              : ": IP address, access timestamps, and device and browser information, used for fraud prevention, platform security, and logs required under applicable law."}
          </li>
        </ul>
        <p>
          {lang === "kn"
            ? "ನೋಂದಣಿಯ ಸಮಯದಲ್ಲಿ ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ನಾವು ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ. ನೀವು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ನೀಡಲು ಆಯ್ಕೆ ಮಾಡಿದಾಗ ಮಾತ್ರ ಪ್ರತ್ಯೇಕ ಸಮ್ಮತಿ ಕೇಳಲಾಗುತ್ತದೆ."
            : "We do not collect health data at registration. Consent is requested separately when you choose to provide health information."}
        </p>
      </section>

      <section id="not">
        <h2>{lang === "kn" ? "ನಿಮ್ಮ ಮಾಹಿತಿಯನ್ನು ನಾವು ಏನು ಮಾಡುವುದಿಲ್ಲ" : "What we do not do with your data"}</h2>
        <p>
          {lang === "kn"
            ? "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ, ಬುಕ್ಕಿಂಗ್ ಇತಿಹಾಸ, ಆರೋಗ್ಯ ಮಾಹಿತಿ ಅಥವಾ ಕ್ಷೇಮಾಭಿರುಚಿಗಳನ್ನು ಜಾಹೀರಾತುದಾರರು, ವಿಶ್ಲೇಷಣಾ ಪೂರೈಕೆದಾರರು ಅಥವಾ ಮೂರನೇ ವ್ಯಕ್ತಿಯ ಮಾರುಕಟ್ಟೆ ಜಾಲಗಳೊಂದಿಗೆ ನಾವು ಹಂಚುವುದಿಲ್ಲ, ಮಾರುವುದಿಲ್ಲ, ಬಾಡಿಗೆಗೆ ನೀಡುವುದಿಲ್ಲ ಅಥವಾ ವ್ಯಾಪಾರ ಮಾಡುವುದಿಲ್ಲ. ನಮ್ಮ ಸೂಚನೆಗಳ ಮೇರೆಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುವ ಸೇವಾ ಪೂರೈಕೆದಾರರಿಗೆ ಮಾಹಿತಿ ಹಂಚಿದರೆ, ಅದು ಅವರ ಕಾರ್ಯ ನಿರ್ವಹಣೆಗೆ ಅಗತ್ಯವಿರುವ ಮಟ್ಟಿಗೆ ಮಾತ್ರ ಸೀಮಿತವಾಗಿರುತ್ತದೆ."
            : "We do not share, sell, rent, license, or trade your personal data, booking history, health data, or wellness preferences with third-party marketing networks, analytics providers, or advertisers. Where data is shared with a service provider acting on our instructions, such as our payment partner, that sharing is limited to what is necessary for that provider to perform its function."}
        </p>
      </section>

      <section id="consent">
        <h2>{lang === "kn" ? "ಸಮ್ಮತಿ" : "Consent"}</h2>
        <p>
          {lang === "kn"
            ? "ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಸಂಸ್ಕರಿಸುವ ಕಾನೂನು ಆಧಾರವಾಗಿ ನಾವು ನಿಮ್ಮ ಸಮ್ಮತಿಯನ್ನು ಅವಲಂಬಿಸುತ್ತೇವೆ. ಆರೋಗ್ಯ ಮಾಹಿತಿ ಸೂಕ್ಷ್ಮ ಸ್ವರೂಪದ್ದಾದುದರಿಂದ ಅದಕ್ಕೆ ಪ್ರತ್ಯೇಕ, ವಿಶೇಷ ಸಮ್ಮತಿ ಅಗತ್ಯವಿರುತ್ತದೆ. ಸಮ್ಮತಿ ಪ್ರತಿ ಮಾಹಿತಿ ವರ್ಗಕ್ಕೆ ಪ್ರತ್ಯೇಕವಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ; ಎಲ್ಲವನ್ನೂ ಒಂದು ಕಡ್ಡಾಯ ಒಪ್ಪಿಗೆಯಾಗಿ ಒಟ್ಟುಗೂಡಿಸಲಾಗುವುದಿಲ್ಲ. ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ಸಮ್ಮತಿಯನ್ನು ಹಿಂತೆಗೆದುಕೊಳ್ಳಬಹುದು "
            : "We rely on your consent as the basis for processing your personal data, and on Health Data specifically because it is sensitive. Consent is collected through an itemised onboarding flow, is specific to each data category, and is never bundled into a single take-it-or-leave-it action. You may withdraw consent at any time through "}
          <Link href="/grievance" className="text-primary underline">
            {lang === "kn" ? "ದೂರು ಪರಿಹಾರ ಮತ್ತು ಖಾತೆ ಸೆಟ್ಟಿಂಗ್ ವ್ಯವಸ್ಥೆಗಳ ಮೂಲಕ" : "our grievance and account settings mechanisms"}
          </Link>
          {lang === "kn" ? "." : "."}
        </p>
      </section>

      <section id="adults">
        <h2>{lang === "kn" ? "ವಯಸ್ಕರಿಗಷ್ಟೇ ಅನ್ವಯಿಸುವ ನೀತಿ" : "Adults-only policy"}</h2>
        <p>
          {lang === "kn"
            ? "ಈ ವೇದಿಕೆ ಹದಿನೆಂಟು ವರ್ಷ ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚು ವಯಸ್ಸಿನ ಬಳಕೆದಾರರಿಗಾಗಿ ಮಾತ್ರ ಉದ್ದೇಶಿಸಲಾಗಿದೆ. ನೋಂದಣಿಯ ವೇಳೆ ನಾವು ನಿಮ್ಮ ಜನ್ಮ ದಿನಾಂಕ ಮತ್ತು ಪ್ರತ್ಯೇಕ ವಯಸ್ಸಿನ ದೃಢೀಕರಣವನ್ನು ಕೇಳುತ್ತೇವೆ. ಹದಿನೆಂಟು ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ ವಯಸ್ಸಿನವರ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ತಿಳಿದಿದ್ದೇ ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ. ಖಾತೆ ಅಪ್ರಾಪ್ತ ವಯಸ್ಕರಿಗೆ ಸೇರಿದೆ ಎಂದು ತಿಳಿದರೆ, ನಾವು ಸಂಸ್ಕರಣೆಯನ್ನು ಸ್ಥಗಿತಗೊಳಿಸಿ ಕೆಳಗಿನ ಕಾಯ್ದಿರింపు ನೀತಿಯ ಪ್ರಕಾರ ಮಾಹಿತಿಯನ್ನು ಅಳಿಸುತ್ತೇವೆ."
            : `${LEGAL_CONFIG.brandName} is intended for users who are 18 years of age or older. We ask for your date of birth and a separate age confirmation during registration. We do not knowingly collect personal data from a person under 18. If we become aware that an account belongs to a minor, we will suspend processing and erase data as described in our `}
          <Link href="/privacy#localisation" className="text-primary underline">
            {lang === "kn" ? "ಕಾಯ್ದಿರింపు ನೀತಿ" : "retention policy"}
          </Link>
          {lang === "kn" ? " ಶಿಕ್ಷಣ ಸಂಸ್ಥೆ ಅಥವಾ ಸಂಸ್ಥೆಯ ಕಾರ್ಯಕ್ರಮಗಳಿಗಾಗಿ " : ". For school or institutional programmes, contact "}
          <a href={`mailto:${email}`} className="text-primary underline">
            {email}
          </a>{" "}
          {lang === "kn" ? "ಗೆ ಮೊದಲು ಸಂಪರ್ಕಿಸಿ." : "before enrolling participants."}
        </p>
      </section>

      <section id="payments">
        <h2>{lang === "kn" ? "ರೇಜರ್‌ಪೇ ಮೂಲಕ ಪಾವತಿ ಪ್ರಕ್ರಿಯೆ" : "Payment processing through Razorpay"}</h2>
        <p>
          {lang === "kn"
            ? "ಪಾವತಿಗಳನ್ನು ಸಂಸ್ಕರಿಸಲು ವೇದಿಕೆ ರೇಜರ್‌ಪೇ ಸಾಫ್ಟ್‌ವೇರ್ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್‌ ಜೊತೆಗೆ ಏಕೀಕೃತವಾಗಿದೆ. ನಿಮ್ಮ ಕಾರ್ಡ್, ಯುಪಿಐ ಅಥವಾ ನೆಟ್‌ಬ್ಯಾಂಕಿಂಗ್ ವಿವರಗಳನ್ನು ನೇರವಾಗಿ ರೇಜರ್‌ಪೇಗೆ ನೀಡಲಾಗುತ್ತದೆ. ಅಷ್ಟಾಂಗ ವೆಲ್‌ಟೆಕ್ ಓಪಿಸಿ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್ ತನ್ನ ಸರ್ವರ್‌ಗಳಲ್ಲಿ ಮೂಲ ಕಾರ್ಡ್ ಸಂಖ್ಯೆ, ಸಿವಿವಿ ಅಥವಾ ಬ್ಯಾಂಕಿಂಗ್ ಪಾಸ್‌ವರ್ಡ್‌ಗಳನ್ನು ನೋಡುವುದಿಲ್ಲ, ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ, ಸಂರಕ್ಷಿಸುವುದಿಲ್ಲ."
            : `To process payments, ${LEGAL_CONFIG.brandName} integrates with Razorpay Software Private Limited, a payment gateway licensed and regulated by the Reserve Bank of India. Your card, UPI, or net banking credentials are provided directly to Razorpay. ${LEGAL_CONFIG.companyLegalName} does not view, collect, or store raw card numbers, CVV, or banking passwords on its servers.`}
        </p>
      </section>

      <section id="localisation">
        <h2>{lang === "kn" ? "ಮಾಹಿತಿ ಸ್ಥಳೀಕರಣ ಮತ್ತು ಕಾಯ್ದಿರింపు" : "Data localisation and retention"}</h2>
        <p>
          {lang === "kn"
            ? "ಎಲ್ಲ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯೂ ಭಾರತದಲ್ಲಿರುವ ಕ್ಲೌಡ್ ಮೂಲಸೌಕರ್ಯದಲ್ಲಿ ಹೋಸ್ಟ್ ಆಗಿರುತ್ತದೆ. ಸಕ್ರಿಯ ಖಾತೆಗೆ ಸಂಬಂಧಿಸಿದ ಗುರುತು, ಬುಕ್ಕಿಂಗ್ ಮತ್ತು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ಖಾತೆ ಸಕ್ರಿಯವಾಗಿರುವವರೆಗೆ ಕಾಯ್ದಿರಿಸಲಾಗುತ್ತದೆ. ಖಾತೆ ಮುಚ್ಚಿದ ನಂತರ ಗುರುತು ಮತ್ತು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ಮுப்பತ್ತು ದಿನಗಳೊಳಗೆ ಅಳಿಸಲಾಗುತ್ತದೆ ಅಥವಾ ಶಾಶ್ವತವಾಗಿ ಗುರುತಿಸಲಾಗದಂತೆ ಅನಾಮಧೇಯಗೊಳಿಸಲಾಗುತ್ತದೆ. ಆದರೆ ಡಿಪಿಡಿಪಿ ನಿಯಮಗಳ ಪ್ರಕಾರ ಕನಿಷ್ಠ ಒಂದು ವರ್ಷದ ಪ್ರಕ್ರಿಯಾ ಲಾಗ್‌ಗಳು ಮತ್ತು ಭಾರತೀಯ ತೆರಿಗೆ/ಕಂಪನಿ ಕಾನೂನುಗಳಿಗೆ ಅಗತ್ಯವಿರುವ ಹಣಕಾಸು ದಾಖಲೆಗಳು ಕಾಯ್ದಿರಿಸಲಾಗಬಹುದು."
            : "All personal data is hosted on cloud infrastructure located within the Republic of India. Identity, booking, and health data tied to an active account are kept while your account is active. On account closure, identity and health data are erased or irreversibly anonymised within 30 days, except where a specific legal retention requirement applies (processing logs for at least one year under DPDP Rules; financial records as required under Indian tax and company law)."}
        </p>
      </section>

      <section id="rights">
        <h2>{lang === "kn" ? "ನಿಮ್ಮ ಹಕ್ಕುಗಳು" : "Your rights"}</h2>
        <p>
          {lang === "kn"
            ? "ಡಿಪಿಡಿಪಿ ಕಾಯಿದೆ, 2023 ಅಡಿಯಲ್ಲಿ ನಿಮಗೆ ಪ್ರವೇಶ, ತಿದ್ದುಪಡಿ, ಅಳಿಸುವಿಕೆ, ನಾಮನಿರ್ದೇಶನ ಮತ್ತು ದೂರು ಪರಿಹಾರದ ಹಕ್ಕುಗಳಿವೆ. ಹೆಚ್ಚಿನ ವಿವರಗಳಿಗೆ "
            : "As a Data Principal under the DPDP Act, 2023, you hold rights including access, correction, erasure, nomination, and grievance redressal. See our "}
          <Link href="/grievance" className="text-primary underline">
            {lang === "kn" ? "ದೂರು ಪರಿಹಾರ ಪುಟ" : "Grievance Redressal page"}
          </Link>{" "}
          {lang === "kn"
            ? "ಮತ್ತು ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು → ಗೌಪ್ಯತೆ ಮತ್ತು ಸಮ್ಮತಿ ನಿರ್ವಹಣೆ ವಿಭಾಗವನ್ನು ನೋಡಿ."
            : "and Account Settings → Privacy and Consent Management."}
        </p>
      </section>

      <section id="contact">
        <h2>{lang === "kn" ? "ಸಂಪರ್ಕ" : "Contact"}</h2>
        <p>
          {lang === "kn" ? "ಈ ಸೂಚನೆಗೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆಗಳನ್ನು " : "Questions about this notice can be sent to "}
          <a href={`mailto:${email}`} className="text-primary underline">
            {email}
          </a>{" "}
          {lang === "kn"
            ? `ಗೆ ಅಥವಾ ನಿಮ್ಮ ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳ ಮೂಲಕ ಕಳುಹಿಸಬಹುದು. ಗ್ರಾಹಕ ಸಂರಕ್ಷಣೆ: ${CUSTOMER_SUPPORT.phoneDisplay} (${CUSTOMER_SUPPORT.hours}). ನೋಂದಾಯಿತ ಕಚೇರಿ: ${formatRegisteredOffice()}. ಸಿಐಎನ್: ${LEGAL_CONFIG.cin}.`
            : `or through your account settings. Customer care: ${CUSTOMER_SUPPORT.phoneDisplay} (${CUSTOMER_SUPPORT.hours}). Registered office: ${formatRegisteredOffice()}. CIN: ${LEGAL_CONFIG.cin}.`}
        </p>
      </section>
        </>
      )}
    </LegalPageLayout>
  );
}
