import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CountryCode {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
}

const countryCodes: CountryCode[] = [
  { code: "AF", dialCode: "+93", flag: "🇦🇫", name: "Afghanistan" },
  { code: "AL", dialCode: "+355", flag: "🇦🇱", name: "Albania" },
  { code: "DZ", dialCode: "+213", flag: "🇩🇿", name: "Algeria" },
  { code: "AS", dialCode: "+1-684", flag: "🇦🇸", name: "American Samoa" },
  { code: "AD", dialCode: "+376", flag: "🇦🇩", name: "Andorra" },
  { code: "AO", dialCode: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "AI", dialCode: "+1-264", flag: "🇦🇮", name: "Anguilla" },
  { code: "AG", dialCode: "+1-268", flag: "🇦🇬", name: "Antigua and Barbuda" },
  { code: "AR", dialCode: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "AM", dialCode: "+374", flag: "🇦🇲", name: "Armenia" },
  { code: "AW", dialCode: "+297", flag: "🇦🇼", name: "Aruba" },
  { code: "AU", dialCode: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "AT", dialCode: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "AZ", dialCode: "+994", flag: "🇦🇿", name: "Azerbaijan" },
  { code: "BS", dialCode: "+1-242", flag: "🇧🇸", name: "Bahamas" },
  { code: "BH", dialCode: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "BD", dialCode: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "BB", dialCode: "+1-246", flag: "🇧🇧", name: "Barbados" },
  { code: "BY", dialCode: "+375", flag: "🇧🇾", name: "Belarus" },
  { code: "BE", dialCode: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "BZ", dialCode: "+501", flag: "🇧🇿", name: "Belize" },
  { code: "BJ", dialCode: "+229", flag: "🇧🇯", name: "Benin" },
  { code: "BM", dialCode: "+1-441", flag: "🇧🇲", name: "Bermuda" },
  { code: "BT", dialCode: "+975", flag: "🇧🇹", name: "Bhutan" },
  { code: "BO", dialCode: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "BA", dialCode: "+387", flag: "🇧🇦", name: "Bosnia and Herzegovina" },
  { code: "BW", dialCode: "+267", flag: "🇧🇼", name: "Botswana" },
  { code: "BR", dialCode: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "BN", dialCode: "+673", flag: "🇧🇳", name: "Brunei" },
  { code: "BG", dialCode: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { code: "BF", dialCode: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "BI", dialCode: "+257", flag: "🇧🇮", name: "Burundi" },
  { code: "KH", dialCode: "+855", flag: "🇰🇭", name: "Cambodia" },
  { code: "CM", dialCode: "+237", flag: "🇨🇲", name: "Cameroon" },
  { code: "CA", dialCode: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "CV", dialCode: "+238", flag: "🇨🇻", name: "Cape Verde" },
  { code: "KY", dialCode: "+1-345", flag: "🇰🇾", name: "Cayman Islands" },
  { code: "CF", dialCode: "+236", flag: "🇨🇫", name: "Central African Republic" },
  { code: "TD", dialCode: "+235", flag: "🇹🇩", name: "Chad" },
  { code: "CL", dialCode: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "CN", dialCode: "+86", flag: "🇨🇳", name: "China" },
  { code: "CO", dialCode: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "KM", dialCode: "+269", flag: "🇰🇲", name: "Comoros" },
  { code: "CG", dialCode: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "CR", dialCode: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "HR", dialCode: "+385", flag: "🇭🇷", name: "Croatia" },
  { code: "CU", dialCode: "+53", flag: "🇨🇺", name: "Cuba" },
  { code: "CY", dialCode: "+357", flag: "🇨🇾", name: "Cyprus" },
  { code: "CZ", dialCode: "+420", flag: "🇨🇿", name: "Czech Republic" },
  { code: "DK", dialCode: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "DJ", dialCode: "+253", flag: "🇩🇯", name: "Djibouti" },
  { code: "DM", dialCode: "+1-767", flag: "🇩🇲", name: "Dominica" },
  { code: "DO", dialCode: "+1-809", flag: "🇩🇴", name: "Dominican Republic" },
  { code: "EC", dialCode: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "EG", dialCode: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "SV", dialCode: "+503", flag: "🇸🇻", name: "El Salvador" },
  { code: "EE", dialCode: "+372", flag: "🇪🇪", name: "Estonia" },
  { code: "ET", dialCode: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { code: "FJ", dialCode: "+679", flag: "🇫🇯", name: "Fiji" },
  { code: "FI", dialCode: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "FR", dialCode: "+33", flag: "🇫🇷", name: "France" },
  { code: "GA", dialCode: "+241", flag: "🇬🇦", name: "Gabon" },
  { code: "GM", dialCode: "+220", flag: "🇬🇲", name: "Gambia" },
  { code: "GE", dialCode: "+995", flag: "🇬🇪", name: "Georgia" },
  { code: "DE", dialCode: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "GH", dialCode: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "GR", dialCode: "+30", flag: "🇬🇷", name: "Greece" },
  { code: "GD", dialCode: "+1-473", flag: "🇬🇩", name: "Grenada" },
  { code: "GT", dialCode: "+502", flag: "🇬🇹", name: "Guatemala" },
  { code: "GN", dialCode: "+224", flag: "🇬🇳", name: "Guinea" },
  { code: "GY", dialCode: "+592", flag: "🇬🇾", name: "Guyana" },
  { code: "HT", dialCode: "+509", flag: "🇭🇹", name: "Haiti" },
  { code: "HN", dialCode: "+504", flag: "🇭🇳", name: "Honduras" },
  { code: "HK", dialCode: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "HU", dialCode: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "IS", dialCode: "+354", flag: "🇮🇸", name: "Iceland" },
  { code: "IN", dialCode: "+91", flag: "🇮🇳", name: "India" },
  { code: "ID", dialCode: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "IR", dialCode: "+98", flag: "🇮🇷", name: "Iran" },
  { code: "IQ", dialCode: "+964", flag: "🇮🇶", name: "Iraq" },
  { code: "IE", dialCode: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "IL", dialCode: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "IT", dialCode: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "JM", dialCode: "+1-876", flag: "🇯🇲", name: "Jamaica" },
  { code: "JP", dialCode: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "JO", dialCode: "+962", flag: "🇯🇴", name: "Jordan" },
  { code: "KZ", dialCode: "+7", flag: "🇰🇿", name: "Kazakhstan" },
  { code: "KE", dialCode: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "KW", dialCode: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "KG", dialCode: "+996", flag: "🇰🇬", name: "Kyrgyzstan" },
  { code: "LA", dialCode: "+856", flag: "🇱🇦", name: "Laos" },
  { code: "LV", dialCode: "+371", flag: "🇱🇻", name: "Latvia" },
  { code: "LB", dialCode: "+961", flag: "🇱🇧", name: "Lebanon" },
  { code: "LS", dialCode: "+266", flag: "🇱🇸", name: "Lesotho" },
  { code: "LR", dialCode: "+231", flag: "🇱🇷", name: "Liberia" },
  { code: "LY", dialCode: "+218", flag: "🇱🇾", name: "Libya" },
  { code: "LI", dialCode: "+423", flag: "🇱🇮", name: "Liechtenstein" },
  { code: "LT", dialCode: "+370", flag: "🇱🇹", name: "Lithuania" },
  { code: "LU", dialCode: "+352", flag: "🇱🇺", name: "Luxembourg" },
  { code: "MO", dialCode: "+853", flag: "🇲🇴", name: "Macau" },
  { code: "MK", dialCode: "+389", flag: "🇲🇰", name: "Macedonia" },
  { code: "MG", dialCode: "+261", flag: "🇲🇬", name: "Madagascar" },
  { code: "MW", dialCode: "+265", flag: "🇲🇼", name: "Malawi" },
  { code: "MY", dialCode: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "MV", dialCode: "+960", flag: "🇲🇻", name: "Maldives" },
  { code: "ML", dialCode: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "MT", dialCode: "+356", flag: "🇲🇹", name: "Malta" },
  { code: "MH", dialCode: "+692", flag: "🇲🇭", name: "Marshall Islands" },
  { code: "MR", dialCode: "+222", flag: "🇲🇷", name: "Mauritania" },
  { code: "MU", dialCode: "+230", flag: "🇲🇺", name: "Mauritius" },
  { code: "MX", dialCode: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "FM", dialCode: "+691", flag: "🇫🇲", name: "Micronesia" },
  { code: "MD", dialCode: "+373", flag: "🇲🇩", name: "Moldova" },
  { code: "MC", dialCode: "+377", flag: "🇲🇨", name: "Monaco" },
  { code: "MN", dialCode: "+976", flag: "🇲🇳", name: "Mongolia" },
  { code: "ME", dialCode: "+382", flag: "🇲🇪", name: "Montenegro" },
  { code: "MA", dialCode: "+212", flag: "🇲🇦", name: "Morocco" },
  { code: "MZ", dialCode: "+258", flag: "🇲🇿", name: "Mozambique" },
  { code: "MM", dialCode: "+95", flag: "🇲🇲", name: "Myanmar" },
  { code: "NA", dialCode: "+264", flag: "🇳🇦", name: "Namibia" },
  { code: "NP", dialCode: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "NL", dialCode: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "NZ", dialCode: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "NI", dialCode: "+505", flag: "🇳🇮", name: "Nicaragua" },
  { code: "NE", dialCode: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "NG", dialCode: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "KP", dialCode: "+850", flag: "🇰🇵", name: "North Korea" },
  { code: "NO", dialCode: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "OM", dialCode: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "PK", dialCode: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "PW", dialCode: "+680", flag: "🇵🇼", name: "Palau" },
  { code: "PA", dialCode: "+507", flag: "🇵🇦", name: "Panama" },
  { code: "PG", dialCode: "+675", flag: "🇵🇬", name: "Papua New Guinea" },
  { code: "PY", dialCode: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "PE", dialCode: "+51", flag: "🇵🇪", name: "Peru" },
  { code: "PH", dialCode: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "PL", dialCode: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "PT", dialCode: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "QA", dialCode: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "RO", dialCode: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "RU", dialCode: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "RW", dialCode: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "SA", dialCode: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "SN", dialCode: "+221", flag: "🇸🇳", name: "Senegal" },
  { code: "RS", dialCode: "+381", flag: "🇷🇸", name: "Serbia" },
  { code: "SG", dialCode: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "SK", dialCode: "+421", flag: "🇸🇰", name: "Slovakia" },
  { code: "SI", dialCode: "+386", flag: "🇸🇮", name: "Slovenia" },
  { code: "SO", dialCode: "+252", flag: "🇸🇴", name: "Somalia" },
  { code: "ZA", dialCode: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "KR", dialCode: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "ES", dialCode: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "LK", dialCode: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "SD", dialCode: "+249", flag: "🇸🇩", name: "Sudan" },
  { code: "SR", dialCode: "+597", flag: "🇸🇷", name: "Suriname" },
  { code: "SZ", dialCode: "+268", flag: "🇸🇿", name: "Swaziland" },
  { code: "SE", dialCode: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "CH", dialCode: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "SY", dialCode: "+963", flag: "🇸🇾", name: "Syria" },
  { code: "TW", dialCode: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "TJ", dialCode: "+992", flag: "🇹🇯", name: "Tajikistan" },
  { code: "TZ", dialCode: "+255", flag: "🇹🇿", name: "Tanzania" },
  { code: "TH", dialCode: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "TG", dialCode: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "TO", dialCode: "+676", flag: "🇹🇴", name: "Tonga" },
  { code: "TT", dialCode: "+1-868", flag: "🇹🇹", name: "Trinidad and Tobago" },
  { code: "TN", dialCode: "+216", flag: "🇹🇳", name: "Tunisia" },
  { code: "TR", dialCode: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "TM", dialCode: "+993", flag: "🇹🇲", name: "Turkmenistan" },
  { code: "UA", dialCode: "+380", flag: "🇺🇦", name: "Ukraine" },
  { code: "AE", dialCode: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "GB", dialCode: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "US", dialCode: "+1", flag: "🇺🇸", name: "United States" },
  { code: "UY", dialCode: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "UZ", dialCode: "+998", flag: "🇺🇿", name: "Uzbekistan" },
  { code: "VE", dialCode: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "VN", dialCode: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "YE", dialCode: "+967", flag: "🇾🇪", name: "Yemen" },
  { code: "ZM", dialCode: "+260", flag: "🇿🇲", name: "Zambia" },
  { code: "ZW", dialCode: "+263", flag: "🇿🇼", name: "Zimbabwe" },
].sort((a, b) => a.name.localeCompare(b.name));

interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: "signup" | "profile";
}

export function CountryCodeSelector({ value, onChange, className = "", variant = "profile" }: CountryCodeSelectorProps) {
  const selectedCountry = countryCodes.find(c => c.dialCode === value);
  
  const triggerClassName = variant === "signup"
    ? `w-[140px] h-11 rounded-full border-0 bg-emerald-50 pl-4 pr-4 text-sm placeholder:text-emerald-700/50 focus-visible:ring-2 focus-visible:ring-emerald-500 ${className}`
    : `w-[140px] rounded-xl bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500 ${className}`;
  
  const handleValueChange = (uniqueValue: string) => {
    // Extract the dial code from the unique value (format: "code-dialCode")
    const dialCode = uniqueValue.split('-').slice(1).join('-');
    onChange(dialCode);
  };
  
  // Create a unique value for each country by combining code and dialCode
  const getUniqueValue = (country: CountryCode) => `${country.code}-${country.dialCode}`;
  
  return (
    <Select value={countryCodes.find(c => c.dialCode === value) ? getUniqueValue(countryCodes.find(c => c.dialCode === value)!) : ""} onValueChange={handleValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Code">
          {selectedCountry && (
            <span className="flex items-center gap-2">
              <span>{selectedCountry.flag}</span>
              <span className="text-sm">{selectedCountry.dialCode}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {countryCodes.map((country) => (
          <SelectItem key={getUniqueValue(country)} value={getUniqueValue(country)} className="flex items-center gap-2">
            <span className="mr-2">{country.flag}</span>
            <span className="text-sm">{country.name}</span>
            <span className="text-xs text-muted-foreground ml-2">({country.dialCode})</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default CountryCodeSelector;
