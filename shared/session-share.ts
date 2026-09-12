export function formatSessionShareDateIst(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function buildClassTypeShareUrl(classTypeId: string, baseUrl: string): string {
  const params = new URLSearchParams({
    openBooking: "true",
    classTypeId,
  });
  return `${baseUrl.replace(/\/$/, "")}/?${params.toString()}`;
}

export function buildBookedSessionShareUrl(classId: string, baseUrl: string): string {
  const params = new URLSearchParams({
    openBooking: "true",
    sessionId: classId,
  });
  return `${baseUrl.replace(/\/$/, "")}/?${params.toString()}`;
}

export function buildClassTypeSharePayload(
  classType: { name: string; price: string | number },
  classTypeId: string,
  baseUrl: string,
): { title: string; text: string; url: string } {
  const url = buildClassTypeShareUrl(classTypeId, baseUrl);
  const price =
    typeof classType.price === "string"
      ? classType.price
      : classType.price.toLocaleString("en-IN");
  const text = `Try ${classType.name} at andWeYoga, ₹${price}/session\n${url}`;
  return { title: `${classType.name} at andWeYoga`, text, url };
}

export function buildBookedSessionSharePayload(
  session: { className: string; instructorName: string; date: string; classId: string },
  baseUrl: string,
): { title: string; text: string; url: string } {
  const when = formatSessionShareDateIst(session.date);
  const url = buildBookedSessionShareUrl(session.classId, baseUrl);
  const text = `I'm joining ${session.className} with ${session.instructorName} on ${when} (IST) at andWeYoga.\nBook your spot: ${url}`;
  return {
    title: `My andWeYoga session: ${session.className}`,
    text,
    url,
  };
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildSmsShareUrl(text: string): string {
  return `sms:?body=${encodeURIComponent(text)}`;
}

export function buildEmailShareUrl(title: string, text: string): string {
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
}
