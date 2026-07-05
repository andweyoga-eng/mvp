import { CUSTOMER_SUPPORT } from "@shared/support";
import { Mail, Phone, Clock, Instagram } from "lucide-react";
import { SectionHeading } from "@/components/digital-zen/section-heading";
import { PageContainer } from "@/components/digital-zen/page-container";

const contacts = [
  { icon: Mail, label: "Email Us", value: CUSTOMER_SUPPORT.email, href: `mailto:${CUSTOMER_SUPPORT.email}` },
  { icon: Phone, label: "Call Us", value: CUSTOMER_SUPPORT.phoneDisplay, href: CUSTOMER_SUPPORT.telHref },
  { icon: Clock, label: "Business Hours", value: CUSTOMER_SUPPORT.hours },
  {
    icon: Instagram,
    label: "Follow Us",
    value: "@andweyoga",
    href: "https://www.instagram.com/andweyoga/",
  },
];

export default function ContactSection() {
  return (
    <section id="contact" className="bg-dz-surface py-16 md:py-20">
      <PageContainer>
        <SectionHeading
          title="Let's"
          accent="Connect"
          subtitle="Ready to begin your journey? Reach out for group sessions, personal training, or corporate bookings."
        />
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {contacts.map((item) => (
            <div key={item.label} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-dz-primary">
                <item.icon className="h-7 w-7" />
              </div>
              <h4 className="font-display text-lg font-semibold text-primary">{item.label}</h4>
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-1.5 inline-block text-sm text-dz-muted hover:text-primary"
                >
                  {item.value}
                </a>
              ) : (
                <p className="mt-1.5 text-sm text-dz-muted">{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
