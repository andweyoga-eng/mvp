import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { LEGAL_CONFIG, formatRegisteredOffice } from "@shared/legal-config";
import { Link } from "wouter";

const SECTIONS = [
  { id: "service", title: (lang: "en" | "kn") => (lang === "kn" ? "ಸೇವೆಯ ಸ್ವರೂಪ" : "Nature of service") },
  { id: "eligibility", title: (lang: "en" | "kn") => (lang === "kn" ? "ಅರ್ಹತೆ" : "Eligibility") },
  { id: "medical", title: (lang: "en" | "kn") => (lang === "kn" ? "ವೈದ್ಯಕೀಯ ಹಕ್ಕುತ್ಯಾಗ" : "Medical disclaimer") },
  { id: "emergency", title: (lang: "en" | "kn") => (lang === "kn" ? "ತುರ್ತು ಸಂದರ್ಭಗಳು" : "No emergency reliance") },
  { id: "liability", title: (lang: "en" | "kn") => (lang === "kn" ? "ಅಪಾಯದ ಒಪ್ಪಿಗೆ" : "Assumption of risk") },
  { id: "payments", title: (lang: "en" | "kn") => (lang === "kn" ? "ಪಾವತಿಗಳು" : "Payments") },
  { id: "law", title: (lang: "en" | "kn") => (lang === "kn" ? "ಆಡಳಿತ ಕಾನೂನು" : "Governing law") },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title={(lang) => (lang === "kn" ? "ಸೇವಾ ನಿಯಮಗಳು" : "Terms of Service")}
      subtitle={(lang) =>
        lang === "kn"
          ? "ಸೇವಾ ನಿಯಮಗಳು ಮತ್ತು ವೈದ್ಯಕೀಯ ಹಕ್ಕುತ್ಯಾಗ"
          : "Terms of Service and Medical Disclaimer"
      }
      sections={SECTIONS}
      showLanguageToggle
    >
      {(lang) => (
        <>
          <section id="service">
            <h2>{lang === "kn" ? "ಸೇವೆಯ ಸ್ವರೂಪ" : "Nature of service"}</h2>
            <p>
              {lang === "kn"
                ? `ಆಂಡ್‌ವೀಯೋಗವನ್ನು ಅಷ್ಟಾಂಗ ವೆಲ್‌ಟೆಕ್ ಓಪಿಸಿ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್ (ಸಿಐಎನ್: ${LEGAL_CONFIG.cin}, ನೋಂದಾಯಿತ ಕಚೇರಿ: ${formatRegisteredOffice()}) ನಡೆಸುತ್ತದೆ. ಈ ವೇದಿಕೆಯು ವಯಸ್ಕ ಬಳಕೆದಾರರು ಯೋಗ ಸೆಷನ್‌ಗಳನ್ನು ಅನ್ವೇಷಿಸಿ, ವೇದಿಕೆಯಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡಲಾದ ಸ್ವತಂತ್ರ ಶಿಕ್ಷಕರು ಮತ್ತು ಸ್ಟುಡಿಯೋಗಳೊಂದಿಗೆ ಸ್ಲಾಟ್‌ಗಳನ್ನು ಬುಕ್ ಮಾಡಲು ಅನುವು ಮಾಡಿಕೊಡುತ್ತದೆ.`
                : `${LEGAL_CONFIG.brandName} is a discovery and booking platform operated by ${LEGAL_CONFIG.companyLegalName} (CIN: ${LEGAL_CONFIG.cin}, registered office: ${formatRegisteredOffice()}). The platform allows adult users to discover yoga sessions and book slots with independent instructors and studios listed on the platform.`}
            </p>
          </section>

          <section id="eligibility">
            <h2>{lang === "kn" ? "ಅರ್ಹತೆ" : "Eligibility"}</h2>
            <p>
              {lang === "kn" ? (
                <>
                  ಆಂಡ್‌ವೀಯೋಗದಲ್ಲಿ ಖಾತೆ ರಚಿಸಲು ಅಥವಾ ಬುಕ್ಕಿಂಗ್ ಮಾಡಲು ನೀವು ಹದಿನೆಂಟು ವರ್ಷ ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚು ವಯಸ್ಸಿನವರಾಗಿರಬೇಕು, ನಮ್ಮ{" "}
                  <Link href="/privacy#adults" className="text-primary underline">
                    ಗೌಪ್ಯತಾ ಸೂಚನೆಯಲ್ಲಿ
                  </Link>{" "}
                  ವಿವರಿಸಿದಂತೆ. ಖಾತೆ ರಚಿಸುವಾಗ, ಅಥವಾ ವೇದಿಕೆಯಲ್ಲಿ ಅತಿಥಿ ಬುಕ್ಕಿಂಗ್ ಸಕ್ರಿಯವಾಗಿರುವಾಗ ಅತಿಥಿ ಬುಕ್ಕಿಂಗ್ ಪೂರ್ಣಗೊಳಿಸುವಾಗ ಈ ಅವಶ್ಯಕತೆಯನ್ನು ನೀವು ದೃಢೀಕರಿಸುತ್ತೀರಿ. ಅತಿಥಿ ಬುಕ್ಕಿಂಗ್ ನಿಷ್ಕ್ರಿಯಗೊಂಡಾಗ, ಡ್ರಾಪ್-ಇನ್ ಮತ್ತು ಟ್ರಯಲ್ ಸೆಷನ್‌ಗಳನ್ನು ಬುಕ್ ಮಾಡಲು ಸೈನ್-ಇನ್ ಖಾತೆ ಅಗತ್ಯ.
                </>
              ) : (
                <>
                  You must be 18 years of age or older to create an account or make a booking on{" "}
                  {LEGAL_CONFIG.brandName}, as described in our{" "}
                  <Link href="/privacy#adults" className="text-primary underline">
                    Privacy Notice
                  </Link>
                  . By creating an account, or completing a guest booking when guest checkout is enabled on the platform, you confirm that you meet this
                  requirement. When guest checkout is disabled, drop-in and trial sessions require a signed-in account to book.
                </>
              )}
            </p>
          </section>

          <section id="medical">
            <h2>{lang === "kn" ? "ಕಡ್ಡಾಯ ವೈದ್ಯಕೀಯ ಹಕ್ಕುತ್ಯಾಗ" : "Mandatory medical disclaimer"}</h2>
            <p className="font-semibold uppercase text-foreground">
              {lang === "kn"
                ? "ಆಂಡ್‌ವೀಯೋಗ ವೈದ್ಯಕೀಯ ವೇದಿಕೆ, ಕ್ಲಿನಿಕ್ ಅಥವಾ ಆರೋಗ್ಯ ಸೇವಾ ಪೂರೈಕೆದಾರ ಅಲ್ಲ. ಈ ವೇದಿಕೆಯ ಮೂಲಕ ಲಭ್ಯವಾಗುವ ಯೋಗ ಸೆಷನ್‌ಗಳು, ತಂತ್ರಗಳು ಮತ್ತು ವಿಷಯಗಳು ಸಾಮಾನ್ಯ ಕ್ಷೇಮ, ವಿಸ್ತರಣೆ ಮತ್ತು ಫಿಟ್‌ನೆಸ್ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಮಾತ್ರ. ಅವು ವೈದ್ಯಕೀಯ ಸಲಹೆ, ರೋಗನಿರ್ಣಯ, ಭೌತಚಿಕಿತ್ಸೆ ಅಥವಾ ಚಿಕಿತ್ಸೆಯನ್ನು ರೂಪಿಸುವುದಿಲ್ಲ ಮತ್ತು ಅರ್ಹ ವೈದ್ಯಕೀಯ ವೃತ್ತಿಪರರ ಸಲಹೆಯ ಬದಲಾಗಿ ಅವಲಂಬಿಸಬಾರದು."
                : `${LEGAL_CONFIG.brandName} is not a medical platform, clinic, or healthcare provider. Yoga sessions, techniques, and content available through this platform are for general wellness, stretching, and fitness purposes only. They do not constitute medical advice, diagnosis, physical therapy, or treatment, and should not be relied upon as a substitute for consultation with a qualified medical professional.`}
            </p>
          </section>

          <section id="emergency">
            <h2>{lang === "kn" ? "ತುರ್ತು ಸಂದರ್ಭಗಳಲ್ಲಿ ಅವಲಂಬಿಸಬೇಡಿ" : "No emergency reliance"}</h2>
            <p className="font-semibold uppercase text-foreground">
              {lang === "kn"
                ? `ಈ ಅಪ್ಲಿಕೇಶನ್ ವೈದ್ಯಕೀಯ ತುರ್ತು ಸಂದರ್ಭಗಳನ್ನು ಪತ್ತೆಹಚ್ಚಲು, ಪ್ರತಿಕ್ರಿಯಿಸಲು ಅಥವಾ ನಿರ್ವಹಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ವೈದ್ಯಕೀಯ ತುರ್ತು ಸಂದರ್ಭ, ತೀವ್ರ ನೋವು, ಉಸಿರಾಟದ ತೊಂದರೆ ಅಥವಾ ಯಾವುದೇ ತುರ್ತು ವೈದ್ಯಕೀಯ ಕಾಳಜಿ ಕಂಡುಬಂದರೆ, ಸಹಾಯಕ್ಕಾಗಿ ಈ ಅಪ್ಲಿಕೇಶನ್ ಬಳಸಬೇಡಿ. ತಕ್ಷಣ ನಿಮ್ಮ ಹತ್ತಿರದ ವೈದ್ಯಕೀಯ ಸೌಲಭ್ಯವನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ರಾಷ್ಟ್ರೀಯ ತುರ್ತು ಸಂಖ್ಯೆ (${LEGAL_CONFIG.emergencyNumbers.national}) ಅಥವಾ ಆಂಬುಲೆನ್ಸ್ ಸೇವೆ (${LEGAL_CONFIG.emergencyNumbers.ambulance}) ಗೆ ಕರೆ ಮಾಡಿ.`
                : `This application cannot detect, respond to, or manage medical emergencies. If you experience a medical emergency, acute pain, shortness of breath, or any urgent medical concern, do not use this application to seek help. Immediately contact your nearest medical facility or dial the national emergency number (${LEGAL_CONFIG.emergencyNumbers.national}) or ambulance services (${LEGAL_CONFIG.emergencyNumbers.ambulance}).`}
            </p>
          </section>

          <section id="liability">
            <h2>{lang === "kn" ? "ಅಪಾಯದ ಒಪ್ಪಿಗೆ ಮತ್ತು ಹೊಣೆಗಾರಿಕೆಯ ಮಿತಿ" : "Assumption of risk and limitation of liability"}</h2>
            <p>
              {lang === "kn"
                ? "ಯೋಗದಲ್ಲಿ ದೈಹಿಕ ಚಲನೆ ಒಳಗೊಂಡಿರುತ್ತದೆ ಮತ್ತು ದೈಹಿಕ ಒತ್ತಡ ಅಥವಾ ಗಾಯದ ಸಹಜ ಅಪಾಯವಿದೆ. ಆಂಡ್‌ವೀಯೋಗದ ಮೂಲಕ ಸೆಷನ್ ಬುಕ್ ಮಾಡುವ ಮೂಲಕ, ಸ್ವಯಂಪ್ರೇರಿತ ಭಾಗವಹಿಸುವಿಕೆಯನ್ನು ನೀವು ಒಪ್ಪುತ್ತೀರಿ ಮತ್ತು ಸೆಷನ್ ಅಗತ್ಯವಿದ್ದರೆ ಸಂಬಂಧಿತ ಆರೋಗ್ಯ ಸ್ಥಿತಿಗಳನ್ನು ಬಹಿರಂಗಪಡಿಸುವುದು ಸೇರಿದಂತೆ ಭಾಗವಹಿಸಲು ನಿಮ್ಮ ಸಾಮರ್ಥ್ಯವನ್ನು ನಿರ್ಣಯಿಸಲು ನೀವು ಮಾತ್ರ ಜವಾಬ್ದಾರರಾಗಿರುತ್ತೀರಿ."
                : `Yoga involves physical movement and carries an inherent risk of physical strain or injury. By booking a session through ${LEGAL_CONFIG.brandName}, you acknowledge voluntary participation and that you are solely responsible for assessing your fitness to participate, including disclosing relevant health conditions where a session requests it.`}
            </p>
            <p>
              {lang === "kn"
                ? "ಅನ್ವಯವಾಗುವ ಕಾನೂನು ಅನುಮತಿಸುವ ಗರಿಷ್ಠ ಮಟ್ಟಿಗೆ, ಸ್ವಯಂಪ್ರೇರಿತ ಭಾಗವಹಿಸುವಿಕೆಯಿಂದ ಉಂಟಾಗುವ ಗಾಯಕ್ಕೆ ಅಷ್ಟಾಂಗ ವೆಲ್‌ಟೆಕ್ ಓಪಿಸಿ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್‌ನ ಹೊಣೆಗಾರಿಕೆ ಮಿತಿಗೊಳಿಸಲಾಗಿದೆ ಮತ್ತು ಯೋಗ ಅಭ್ಯಾಸದ ಸಹಜ ದೈಹಿಕ ಅಪಾಯಗಳಿಂದ ಉಂಟಾಗುವ ಸಾಮಾನ್ಯ ನಿರ್ಲಕ್ಷ್ಯದ ಹಕ್ಕುದಾವೆಗಳನ್ನು ಹೊರಗಿಡಲಾಗಿದೆ. ಭಾರತೀಯ ಕಾನೂನಿನ ಅಡಿಯಲ್ಲಿ ಕಾನೂನುಬದ್ಧವಾಗಿ ಹೊರಗಿಡಲು ಸಾಧ್ಯವಿಲ್ಲದ ಹೊಣೆಗಾರಿಕೆ, ಉದಾಹರಣೆಗೆ ಗಂಭೀರ ನಿರ್ಲಕ್ಷ್ಯ, ಉದ್ದೇಶಪೂರ್ವಕ ದುರ್ನಡತೆ ಅಥವಾ ವಂಚನೆ, ಇಲ್ಲಿ ಹೊರಗಿಡಲಾಗುವುದಿಲ್ಲ."
                : `To the maximum extent permitted under applicable law, ${LEGAL_CONFIG.companyLegalName}'s liability for injury arising from voluntary participation is limited and excludes ordinary negligence claims arising from inherent physical risks of yoga practice. Nothing here excludes liability that cannot lawfully be excluded under Indian law, including gross negligence, wilful misconduct, or fraud.`}
            </p>
            <p>
              {lang === "kn"
                ? "ಆಂಡ್‌ವೀಯೋಗದಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡಲಾದ ಶಿಕ್ಷಕರು ಮತ್ತು ಸ್ಟುಡಿಯೋಗಳು ಸ್ವತಂತ್ರ ಮೂರನೇ ವ್ಯಕ್ತಿಗಳು. ಆಂಡ್‌ವೀಯೋಗದ ಪಾತ್ರ ಅನ್ವೇಷಣೆ ಮತ್ತು ಬುಕ್ಕಿಂಗ್ ಸೌಲಭ್ಯಕ್ಕೆ ಮಾತ್ರ ಸೀಮಿತವಾಗಿರುತ್ತದೆ, ವಿಶೇಷವಾಗಿ ಹೇಳದ ಹೊರತು."
                : `Instructors and studios listed on ${LEGAL_CONFIG.brandName} are independent third parties. ${LEGAL_CONFIG.brandName}'s role is limited to discovery and booking facilitation unless expressly stated otherwise.`}
            </p>
          </section>

          <section id="payments">
            <h2>{lang === "kn" ? "ಪಾವತಿಗಳು ಮತ್ತು ರದ್ದತಿ" : "Payments and cancellations"}</h2>
            <p>
              {lang === "kn"
                ? "ಎಲ್ಲ ಪಾವತಿಗಳನ್ನು ರೇಜರ್‌ಪೇ ಸಾಫ್ಟ್‌ವೇರ್ ಪ್ರೈವೇಟ್ ಲಿಮಿಟೆಡ್ ಮೂಲಕ ಸಂಸ್ಕರಿಸಲಾಗುತ್ತದೆ. ಬುಕ್ಕಿಂಗ್ ಪ್ರಾರಂಭಿಸುವ ಮೂಲಕ, ಪಾವತಿ ವಹಿವಾಟಿಗೆ ಅನ್ವಯವಾಗುವ ರೇಜರ್‌ಪೇ ನಿಯಮಗಳಿಗೂ ನೀವು ಒಪ್ಪುತ್ತೀರಿ. ವಿಫಲವಾದ ವಹಿವಾಟುಗಳು ಮತ್ತು ಮರುಪಾವತಿಗಳನ್ನು ರೇಜರ್‌ಪೇದ ಮಾನಕ ನಿಷ್ಪತ್ತಿ ವ್ಯವಸ್ಥೆಯ ಮೂಲಕ ಸಂಸ್ಕರಿಸಲಾಗುತ್ತದೆ."
                : "All payments are processed through Razorpay Software Private Limited. By initiating a booking, you also agree to Razorpay's applicable terms governing the payment transaction. Failed transactions and refunds are processed through Razorpay's standard settlement pipeline."}
            </p>
          </section>

          <section id="law">
            <h2>{lang === "kn" ? "ಆಡಳಿತ ಕಾನೂನು ಮತ್ತು ವಿವಾದ ಪರಿಹಾರ" : "Governing law and dispute resolution"}</h2>
            <p>
              {lang === "kn"
                ? "ಈ ನಿಯಮಗಳು ಭಾರತದ ಕಾನೂನುಗಳಿಗೆ ಒಳಪಟ್ಟಿವೆ. ಬೆಂಗಳೂರು, ಕರ್ನಾಟಕದ ನ್ಯಾಯಾಲಯಗಳಿಗೆ ವಿಶೇಷ ಅಧಿಕಾರಾವಕಾಶವಿದೆ, ಅನ್ವಯವಾಗುವ ಸ್ಥಳದಲ್ಲಿ ಉಪಭೋಕ್ತಾ ವೇದಿಕೆಗಳು ಅಥವಾ ಡೇಟಾ ಪ್ರೊಟೆಕ್ಷನ್ ಬೋರ್ಡ್ ಆಫ್ ಇಂಡಿಯಾವನ್ನು ಸಂಪರ್ಕಿಸುವ ನಿಮ್ಮ ಹಕ್ಕು ಉಳಿದಿದೆ."
                : "These Terms are governed by the laws of India. Courts at Bengaluru, Karnataka shall have exclusive jurisdiction, subject to your right to approach consumer forums or the Data Protection Board of India where applicable."}
            </p>
          </section>
        </>
      )}
    </LegalPageLayout>
  );
}
