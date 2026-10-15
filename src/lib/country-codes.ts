// Dial codes and flags for the phone pickers. India first because most clients are Indian.
export interface Country {
  name: string
  dial: string // "+91"
  code: string // "IN"
  flag: string // "🇮🇳"
}

function getFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("")
}

const RAW: [string, string, string][] = [
  ["India", "91", "IN"], ["United States", "1", "US"], ["Canada", "1", "CA"], ["United Kingdom", "44", "GB"], ["United Arab Emirates", "971", "AE"],
  ["Saudi Arabia", "966", "SA"], ["Qatar", "974", "QA"], ["Kuwait", "965", "KW"], ["Oman", "968", "OM"], ["Bahrain", "973", "BH"],
  ["Singapore", "65", "SG"], ["Malaysia", "60", "MY"], ["Australia", "61", "AU"], ["New Zealand", "64", "NZ"], ["Ireland", "353", "IE"],
  ["Germany", "49", "DE"], ["France", "33", "FR"], ["Italy", "39", "IT"], ["Spain", "34", "ES"], ["Netherlands", "31", "NL"],
  ["Afghanistan", "93", "AF"], ["Albania", "355", "AL"], ["Algeria", "213", "DZ"], ["Argentina", "54", "AR"], ["Armenia", "374", "AM"],
  ["Austria", "43", "AT"], ["Azerbaijan", "994", "AZ"], ["Bangladesh", "880", "BD"], ["Belarus", "375", "BY"], ["Belgium", "32", "BE"],
  ["Bhutan", "975", "BT"], ["Bolivia", "591", "BO"], ["Bosnia and Herzegovina", "387", "BA"], ["Botswana", "267", "BW"], ["Brazil", "55", "BR"],
  ["Brunei", "673", "BN"], ["Bulgaria", "359", "BG"], ["Cambodia", "855", "KH"], ["Cameroon", "237", "CM"], ["Chile", "56", "CL"],
  ["China", "86", "CN"], ["Colombia", "57", "CO"], ["Costa Rica", "506", "CR"], ["Croatia", "385", "HR"], ["Cyprus", "357", "CY"],
  ["Czech Republic", "420", "CZ"], ["Denmark", "45", "DK"], ["Dominican Republic", "1809", "DO"], ["Ecuador", "593", "EC"], ["Egypt", "20", "EG"],
  ["Estonia", "372", "EE"], ["Ethiopia", "251", "ET"], ["Fiji", "679", "FJ"], ["Finland", "358", "FI"], ["Georgia", "995", "GE"],
  ["Ghana", "233", "GH"], ["Greece", "30", "GR"], ["Hong Kong", "852", "HK"], ["Hungary", "36", "HU"], ["Iceland", "354", "IS"],
  ["Indonesia", "62", "ID"], ["Iran", "98", "IR"], ["Iraq", "964", "IQ"], ["Israel", "972", "IL"], ["Jamaica", "1876", "JM"],
  ["Japan", "81", "JP"], ["Jordan", "962", "JO"], ["Kazakhstan", "7", "KZ"], ["Kenya", "254", "KE"], ["Latvia", "371", "LV"],
  ["Lebanon", "961", "LB"], ["Lithuania", "370", "LT"], ["Luxembourg", "352", "LU"], ["Maldives", "960", "MV"], ["Malta", "356", "MT"],
  ["Mauritius", "230", "MU"], ["Mexico", "52", "MX"], ["Moldova", "373", "MD"], ["Mongolia", "976", "MN"], ["Morocco", "212", "MA"],
  ["Myanmar", "95", "MM"], ["Namibia", "264", "NA"], ["Nepal", "977", "NP"], ["Nigeria", "234", "NG"], ["Norway", "47", "NO"],
  ["Pakistan", "92", "PK"], ["Panama", "507", "PA"], ["Peru", "51", "PE"], ["Philippines", "63", "PH"], ["Poland", "48", "PL"],
  ["Portugal", "351", "PT"], ["Romania", "40", "RO"], ["Russia", "7", "RU"], ["Rwanda", "250", "RW"], ["Serbia", "381", "RS"],
  ["Slovakia", "421", "SK"], ["Slovenia", "386", "SI"], ["South Africa", "27", "ZA"], ["South Korea", "82", "KR"], ["Sri Lanka", "94", "LK"],
  ["Sweden", "46", "SE"], ["Switzerland", "41", "CH"], ["Taiwan", "886", "TW"], ["Tanzania", "255", "TZ"], ["Thailand", "66", "TH"],
  ["Trinidad and Tobago", "1868", "TT"], ["Tunisia", "216", "TN"], ["Turkey", "90", "TR"], ["Uganda", "256", "UG"], ["Ukraine", "380", "UA"],
  ["Uruguay", "598", "UY"], ["Uzbekistan", "998", "UZ"], ["Venezuela", "58", "VE"], ["Vietnam", "84", "VN"], ["Zambia", "260", "ZM"],
  ["Zimbabwe", "263", "ZW"]
]

export const COUNTRIES: Country[] = RAW.map(([name, d, code]) => ({
  name,
  dial: `+${d}`,
  code,
  flag: getFlag(code),
}))

/** Phone digits allowed after the country code. India is exactly 10; elsewhere 6-12. */
export function phoneDigitRange(dial: string): { min: number; max: number } {
  return dial === "+91" ? { min: 10, max: 10 } : { min: 6, max: 12 }
}
