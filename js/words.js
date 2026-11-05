/**
 * Indian and International Currency Number-to-Words Converter
 * Converts numeric amounts into words, e.g.:
 * 34000 -> "Rupees Thirty-Four Thousand Only"
 * 34000.50 -> "Rupees Thirty-Four Thousand and Fifty Paise Only"
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertTwoDigits(n) {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return TENS[ten] + (one > 0 ? "-" + ONES[one] : "");
}

function convertThreeDigits(n) {
  let str = "";
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  if (hundred > 0) {
    str += ONES[hundred] + " Hundred";
    if (remainder > 0) str += " and ";
  }
  if (remainder > 0) {
    str += convertTwoDigits(remainder);
  }
  return str;
}

/**
 * Converts a positive number to Indian numbering system words (Crores, Lakhs, Thousands, Hundreds)
 */
function numberToIndianWords(num) {
  if (num === 0) return "Zero";

  let n = Math.floor(num);
  let words = "";

  // Crores (>= 1,00,00,000)
  const crores = Math.floor(n / 10000000);
  n %= 10000000;
  if (crores > 0) {
    words += (crores < 100 ? convertTwoDigits(crores) : convertThreeDigits(crores)) + " Crore ";
  }

  // Lakhs (>= 1,00,000)
  const lakhs = Math.floor(n / 100000);
  n %= 100000;
  if (lakhs > 0) {
    words += convertTwoDigits(lakhs) + " Lakh ";
  }

  // Thousands (>= 1,000)
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  if (thousands > 0) {
    words += convertTwoDigits(thousands) + " Thousand ";
  }

  // Hundreds and remaining (< 1,000)
  if (n > 0) {
    words += convertThreeDigits(n) + " ";
  }

  return words.trim();
}

/**
 * Main function: Formats complete currency amount in words with currency prefix and fractional units.
 * @param {number} amount 
 * @param {string} currencySymbol - '₹', '$', '€', '£', etc.
 * @returns {string}
 */
export function amountToWords(amount, currencySymbol = "₹") {
  if (isNaN(amount) || amount === null || amount === undefined) return "";
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let currencyName = "Rupees";
  let fractionName = "Paise";

  if (currencySymbol === "$") {
    currencyName = "Dollars";
    fractionName = "Cents";
  } else if (currencySymbol === "€") {
    currencyName = "Euros";
    fractionName = "Cents";
  } else if (currencySymbol === "£") {
    currencyName = "Pounds";
    fractionName = "Pence";
  } else if (currencySymbol === "AED") {
    currencyName = "Dirhams";
    fractionName = "Fils";
  }

  const intWords = numberToIndianWords(integerPart);
  let result = currencyName + " " + intWords;

  if (decimalPart > 0) {
    const decWords = convertTwoDigits(decimalPart);
    result += " and " + decWords + " " + fractionName;
  }

  result += " Only";
  return result;
}
