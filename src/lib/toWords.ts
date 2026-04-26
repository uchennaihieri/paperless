import { ToWords } from "to-words";

const converter = new ToWords({
  localeCode: "en-GB",
  converterOptions: {
    currency: false,
    ignoreDecimal: true, // we handle decimals manually as Kobo
  },
});

// Sub-hundred starters — used to know when to insert "and" after Hundred
const SUB_HUNDRED = [
  "One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
  "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen",
  "Eighteen","Nineteen","Twenty","Thirty","Forty","Fifty","Sixty","Seventy",
  "Eighty","Ninety",
];
const SUB_HUNDRED_RE = new RegExp(`(${SUB_HUNDRED.join("|")})$`);

/**
 * Insert British-style "and" and commas into the raw to-words output.
 * Raw: "Eight Hundred Fifty Two Thousand Three Hundred One"
 * Out: "Eight Hundred and Fifty Two Thousand, Three Hundred and One"
 */
function britishFormat(words: string): string {
  // 1. Insert "and" after every "Hundred" that is followed by more words, except Thousand/Million/Billion
  let out = words.replace(/Hundred (?=(?!Thousand|Million|Billion)[A-Z])/g, "Hundred and ");

  // 2. Insert comma after Thousand / Million / Billion when followed by more words
  out = out.replace(/(Thousand|Million|Billion) (?=[A-Z])/g, "$1, ");

  return out;
}

/**
 * Convert a numeric value to its Naira/Kobo legal word representation.
 *
 * Examples
 * ─────────────────────────────────────────────────────────────────────────────
 * 852301.52 → "Eight Hundred and Fifty Two Thousand, Three Hundred and One Naira, Fifty Two Kobo Only"
 * 1275000   → "One Million, Two Hundred and Seventy Five Thousand Naira Only"
 * 500       → "Five Hundred Naira Only"
 * 12500.50  → "Twelve Thousand, Five Hundred Naira, Fifty Kobo Only"
 *
 * @param value    - Number or numeric string (commas stripped automatically)
 * @param currency - Main unit label  (default: "Naira")
 * @param cents    - Sub-unit label   (default: "Kobo")
 */
export function numberToWords(
  value: string | number,
  currency = "Naira",
  cents = "Kobo"
): string {
  if (value === "" || value === null || value === undefined) return "";

  const str = String(value).replace(/,/g, "").trim();
  if (!str || isNaN(Number(str))) return "";

  const isNegative = str.startsWith("-");
  const absStr = isNegative ? str.slice(1) : str;
  const [intStr, decStr] = absStr.split(".");
  const intNum = parseInt(intStr || "0", 10);

  try {
    const intWords  = britishFormat(converter.convert(intNum));
    const sign      = isNegative ? "Negative " : "";
    let   result    = `${sign}${intWords} ${currency}`;

    // Decimal → Kobo: treat the 2-digit decimal as its own integer
    // ".52" → 52 Kobo | ".5" → 50 Kobo (padded to 2dp)
    if (decStr !== undefined) {
      const koboPadded = decStr.padEnd(2, "0").slice(0, 2);
      const koboNum    = parseInt(koboPadded, 10);
      if (koboNum > 0) {
        const koboWords = britishFormat(converter.convert(koboNum));
        result += `, ${koboWords} ${cents}`;
      }
    }

    return result + " Only";
  } catch {
    return "";
  }
}
