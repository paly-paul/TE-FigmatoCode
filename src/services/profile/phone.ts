const ISO_TO_DIAL_CODE: Record<string, string> = {
  AF: "+93",
  AL: "+355",
  DZ: "+213",
  AS: "+1684",
  AD: "+376",
  AO: "+244",
  AI: "+1264",
  AQ: "+672",
  AG: "+1268",
  AR: "+54",
  AM: "+374",
  AW: "+297",
  AU: "+61",
  AT: "+43",
  AZ: "+994",
  BS: "+1242",
  BH: "+973",
  BD: "+880",
  BB: "+1246",
  BY: "+375",
  BE: "+32",
  BZ: "+501",
  BJ: "+229",
  BM: "+1441",
  BT: "+975",
  BO: "+591",
  BA: "+387",
  BW: "+267",
  BR: "+55",
  BN: "+673",
  BG: "+359",
  BF: "+226",
  BI: "+257",
  KH: "+855",
  CM: "+237",
  CA: "+1",
  CV: "+238",
  KY: "+1345",
  CF: "+236",
  TD: "+235",
  CL: "+56",
  CN: "+86",
  CO: "+57",
  KM: "+269",
  CG: "+242",
  CR: "+506",
  CI: "+225",
  HR: "+385",
  CU: "+53",
  CY: "+357",
  CZ: "+420",
  DK: "+45",
  DJ: "+253",
  DM: "+1767",
  DO: "+1809",
  EC: "+593",
  EG: "+20",
  SV: "+503",
  GQ: "+240",
  ER: "+291",
  EE: "+372",
  ET: "+251",
  FI: "+358",
  FR: "+33",
  GA: "+241",
  GM: "+220",
  GE: "+995",
  DE: "+49",
  GH: "+233",
  GI: "+350",
  GR: "+30",
  GL: "+299",
  GD: "+1473",
  GT: "+502",
  GN: "+224",
  GY: "+592",
  HT: "+509",
  HN: "+504",
  HK: "+852",
  HU: "+36",
  IS: "+354",
  IN: "+91",
  ID: "+62",
  IR: "+98",
  IQ: "+964",
  IE: "+353",
  IL: "+972",
  IT: "+39",
  JP: "+81",
  JO: "+962",
  KZ: "+7",
  KE: "+254",
  KW: "+965",
  KG: "+996",
  LA: "+856",
  LV: "+371",
  LB: "+961",
  LS: "+266",
  LR: "+231",
  LY: "+218",
  LT: "+370",
  LU: "+352",
  MO: "+853",
  MK: "+389",
  MG: "+261",
  MY: "+60",
  MV: "+960",
  ML: "+223",
  MT: "+356",
  MX: "+52",
  MD: "+373",
  MN: "+976",
  ME: "+382",
  MA: "+212",
  MZ: "+258",
  NA: "+264",
  NP: "+977",
  NL: "+31",
  NZ: "+64",
  NG: "+234",
  NO: "+47",
  OM: "+968",
  PK: "+92",
  PA: "+507",
  PE: "+51",
  PH: "+63",
  PL: "+48",
  PT: "+351",
  PR: "+1787",
  QA: "+974",
  RO: "+40",
  RU: "+7",
  SA: "+966",
  SG: "+65",
  ZA: "+27",
  KR: "+82",
  ES: "+34",
  LK: "+94",
  SE: "+46",
  CH: "+41",
  TW: "+886",
  TH: "+66",
  TR: "+90",
  TZ: "+255",
  UA: "+380",
  AE: "+971",
  GB: "+44",
  US: "+1",
  UY: "+598",
  UZ: "+998",
  VN: "+84",
  YE: "+967",
  ZM: "+260",
  ZW: "+263",
};

export function normalizeCountryCode(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return undefined;
  const isoCode = trimmed.toUpperCase();
  if (/^[A-Z]{2}$/.test(isoCode)) {
    return ISO_TO_DIAL_CODE[isoCode];
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;
  return `+${digits}`;
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

  const normalizedPhone = rawPhone.startsWith("+")
    ? `+${digitsOnly(rawPhone)}`
    : rawPhone.replace(/\s+/g, "");
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
