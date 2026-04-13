export function normalizeCountryCode(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;

  const match = trimmed.match(/^\+\d{1,4}/);
  return match?.[0];
}

function sanitizePhoneInput(value: string | undefined): string {
  return (value ?? "").trim();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function buildE164Phone(
  phone: string | undefined,
  countryCode: string | undefined
): string | undefined {
  const rawPhone = sanitizePhoneInput(phone);
  if (!rawPhone) return undefined;

  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const phoneDigits = digitsOnly(rawPhone);
  if (!phoneDigits) return undefined;

  if (!normalizedCountryCode) {
    return rawPhone.startsWith("+") ? `+${phoneDigits}` : phoneDigits;
  }

  const countryDigits = normalizedCountryCode.slice(1);
  const normalizedRaw = rawPhone.replace(/\s+/g, "");

  if (normalizedRaw.startsWith("+")) {
    return `+${phoneDigits}`;
  }

  if (normalizedRaw.startsWith("00")) {
    const withoutInternationalPrefix = normalizedRaw.slice(2);
    return `+${digitsOnly(withoutInternationalPrefix)}`;
  }

  if (phoneDigits.startsWith(countryDigits) && rawPhone.includes("+")) {
    return `+${phoneDigits}`;
  }

  return `${normalizedCountryCode}${phoneDigits}`;
}

export function splitPhoneFromCountryCode(
  phone: string | undefined,
  countryCode: string | undefined
): { countryCode?: string; phone?: string } {
  const rawPhone = sanitizePhoneInput(phone);
  const normalizedCountryCode = normalizeCountryCode(countryCode);

  if (!rawPhone) {
    return { countryCode: normalizedCountryCode };
  }

  if (!normalizedCountryCode) {
    return { phone: rawPhone };
  }

  const normalizedPhone = rawPhone.replace(/\s+/g, "");
  if (normalizedPhone.startsWith(normalizedCountryCode)) {
    const localPhone = rawPhone.slice(normalizedCountryCode.length).replace(/^[\s()-]+/, "").trim();
    return {
      countryCode: normalizedCountryCode,
      phone: localPhone || rawPhone,
    };
  }

  return {
    countryCode: normalizedCountryCode,
    phone: rawPhone,
  };
}
