
const a = [
  "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
  "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"
];
const b = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

const w = (n) => {
  if (n < 20) return a[Math.floor(n)];
  if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[Math.floor(n % 10)] : "");
  if (n < 1000) return a[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " " + w(n % 100) : "");
  if (n < 100000) return w(Math.floor(n / 1000)) + " THOUSAND" + (n % 1000 ? " " + w(n % 1000) : "");
  if (n < 10000000) return w(Math.floor(n / 100000)) + " LAKH" + (n % 100000 ? " " + w(n % 100000) : "");
  return w(Math.floor(n / 10000000)) + " CRORE" + (n % 10000000 ? " " + w(n % 10000000) : "");
};

const convertNumberToWords = (num) => {
  if (!num || num === 0) return "ZERO ONLY";
  const main = Math.floor(num);
  const decimals = Math.round((num - main) * 100);
  let res = w(main).trim();
  if (decimals > 0) {
    res += " AND " + w(decimals).trim() + " PAISA";
  }
  return res + " ONLY";
};

const testCases = [
  164614,
  100000,
  10000000,
  12345678,
  100,
  50,
  164614.50,
  100001,
  1000000,
  9999999,
  10000000.75
];

testCases.forEach(tc => {
  console.log(`Input: ${tc.toString().padStart(12)} -> Word: ${convertNumberToWords(tc)}`);
});
