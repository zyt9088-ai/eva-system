import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

const rawFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export const RESEND_FROM_EMAIL = rawFrom.includes("<")
  ? rawFrom
  : `نظام قيّم <${rawFrom}>`;
