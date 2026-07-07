import { CUSTOMER_SUPPORT } from "@shared/support";
import { Mail, Phone, Clock, Instagram, MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/digital-zen/section-heading";
import { PageContainer } from "@/components/digital-zen/page-container";

type ContactAction = {
  label: string;
  href: string;
  external?: boolean;
};

type ContactItem = {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  actions?: ContactAction[];
};

const contacts: ContactItem[] = [
  {
    icon: Mail,
    label: "Email Us",
    value: CUSTOMER_SUPPORT.email,
    href: `mailto:${CUSTOMER_SUPPORT.email}`,
  },
  {
    icon: Phone,
    label: "Call or WhatsApp",
    value: CUSTOMER_SUPPORT.phoneDisplay,
    actions: [
      { label: "Call", href: CUSTOMER_SUPPORT.telHref },
      { label: "WhatsApp", href: CUSTOMER_SUPPORT.whatsappHref, external: true },
    ],
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: CUSTOMER_SUPPORT.hours,
  },
  {
    icon: Instagram,
    label: "Follow Us",
    value: "@andweyoga",
    href: "https://www.instagram.com/andweyoga/",
    external: true,
  },
];

function ContactIcon({ item }: { item: ContactItem }) {
  const primaryHref = item.href ?? item.actions?.[0]?.href;
  const iconClassName =
    "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-dz-primary transition-transform hover:scale-105";

  if (!primaryHref) {
    return (
      <div className={iconClassName}>
        <item.icon className="h-7 w-7" />
      </div>
    );
  }

  return (
    <a
      href={primaryHref}
      target={item.external || item.actions?.[0]?.external ? "_blank" : undefined}
      rel={item.external || item.actions?.[0]?.external ? "noopener noreferrer" : undefined}
      className={iconClassName}
      aria-label={item.label}
      data-testid={`contact-icon-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <item.icon className="h-7 w-7" />
    </a>
  );
}

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
              <ContactIcon item={item} />
              <h4 className="font-display text-lg font-semibold text-primary">{item.label}</h4>
              {item.actions ? (
                <div className="mt-2 flex flex-col items-center gap-2">
                  <p className="text-sm text-dz-muted">{item.value}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {item.actions.map((action) => (
                      <a
                        key={action.label}
                        href={action.href}
                        target={action.external ? "_blank" : undefined}
                        rel={action.external ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
                        data-testid={`contact-action-${action.label.toLowerCase()}`}
                      >
                        {action.label === "WhatsApp" ? (
                          <MessageCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Phone className="h-3.5 w-3.5" />
                        )}
                        {action.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : item.href ? (
                <a
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="mt-1.5 inline-block text-sm text-dz-muted hover:text-primary"
                  data-testid={`contact-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
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
