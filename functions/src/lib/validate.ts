import { fail } from "../errors";
import { SUPPORTED_LOCALES } from "../runtime";

export function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail("INVALID_ARGUMENT", `${field} is required`);
  }
  return value.trim();
}

export function requireEmail(value: unknown): string {
  const email = requireNonEmpty(value, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail("INVALID_ARGUMENT", "email is invalid");
  }
  return email;
}

export function exactlyOne(
  data: Record<string, unknown>,
  fields: readonly string[]
): string {
  const present = fields.filter((field) => {
    const value = data[field];
    return value !== undefined && value !== null && value !== "";
  });
  if (present.length !== 1) {
    fail("INVALID_ARGUMENT", `Exactly one of ${fields.join(", ")} is required`);
  }
  return present[0];
}

export function validateGstin(value: string): void {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim().toUpperCase())) {
    fail("INVALID_ARGUMENT", "GSTIN is invalid");
  }
}

export function validatePan(value: string): void {
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase())) {
    fail("INVALID_ARGUMENT", "PAN is invalid");
  }
}

export function validatePincode(value: string): void {
  if (!/^[1-9][0-9]{5}$/.test(value.trim())) {
    fail("INVALID_ARGUMENT", "pincode is invalid");
  }
}

export function validateIfsc(value: string): void {
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.trim().toUpperCase())) {
    fail("INVALID_ARGUMENT", "IFSC is invalid");
  }
}

export function validateVpa(value: string): void {
  if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(value.trim())) {
    fail("INVALID_ARGUMENT", "VPA is invalid");
  }
}

export function validateLocale(value: string): void {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(value)) {
    fail("INVALID_ARGUMENT", "locale is not supported");
  }
}

export interface PhoneCountry {
  callingCode?: string;
  phoneCountryCode?: string;
  mobilePrefix?: string;
  phoneRegex?: string;
  phoneNumberRegex?: string;
  phoneValidationRegex?: string;
  phoneNumberLength?: number;
  minPhoneDigits?: number;
  maxPhoneDigits?: number;
}

export function validatePhoneAgainstCountry(phone: string, country: PhoneCountry): void {
  const normalized = phone.trim();
  const configured =
    country.phoneValidationRegex ?? country.phoneRegex ?? country.phoneNumberRegex;
  if (configured) {
    try {
      if (!new RegExp(configured).test(normalized)) fail("INVALID_PHONE");
      return;
    } catch {
      fail("INVALID_STATE", "Country phone validation is misconfigured");
    }
  }

  const digits = normalized.replace(/\D/g, "");
  const callingCode = (
    country.mobilePrefix ??
    country.callingCode ??
    country.phoneCountryCode ??
    ""
  ).replace(/\D/g, "");
  const localDigits =
    callingCode && digits.startsWith(callingCode) ? digits.slice(callingCode.length) : digits;
  const exact = country.phoneNumberLength;
  const min = Number(exact ?? country.minPhoneDigits ?? 7);
  const max = Number(exact ?? country.maxPhoneDigits ?? 15);
  if (localDigits.length < min || localDigits.length > max) fail("INVALID_PHONE");
}
