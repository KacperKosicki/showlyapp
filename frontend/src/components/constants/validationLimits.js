export const TAGS_LIMIT = 3;
export const TAG_MAX_LENGTH = 24;

export const LINK_MAX_LENGTH = 180;
export const SOCIAL_LINK_MAX_LENGTH = 180;

export const CONTACT_EMAIL_MAX_LENGTH = 80;
export const CONTACT_PHONE_MAX_LENGTH = 20;
export const CONTACT_STREET_MAX_LENGTH = 80;
export const CONTACT_POSTCODE_MAX_LENGTH = 12;

export const SERVICE_NAME_MAX_LENGTH = 60;
export const SERVICE_SHORT_DESCRIPTION_MAX_LENGTH = 160;
export const SERVICE_PRICE_MAX = 1000000;

export const SERVICE_DURATION_LIMITS = {
  minutes: { min: 15, max: 1440, label: "minut" },
  hours: { min: 1, max: 24, label: "godzin" },
  days: { min: 1, max: 365, label: "dni" },
  weeks: { min: 1, max: 52, label: "tygodni" },
};