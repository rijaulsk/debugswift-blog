import type { SchemaTypeDefinition } from "sanity";
import {
  bodyType,
  calloutBlock,
  codeBlock,
  comparisonTable,
  faqBlock,
  figure,
  serviceLink,
  sourcedStat,
  stepsBlock,
} from "./blocks";
import author from "./author";
import guestDraft from "./guestDraft";
import guestPitch from "./guestPitch";
import post from "./post";
import siteSettings from "./siteSettings";
import topic from "./topic";

export const schemaTypes: SchemaTypeDefinition[] = [
  /* Documents */
  post,
  topic,
  author,
  guestPitch,
  guestDraft,
  siteSettings,
  /* Body + its block types */
  bodyType,
  figure,
  calloutBlock,
  faqBlock,
  stepsBlock,
  comparisonTable,
  serviceLink,
  sourcedStat,
  codeBlock,
];
