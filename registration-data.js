/* ============================================================
   REGISTRATION DATA — worldwide configuration for onboarding.
   Country-aware (never assume Zimbabwe). Dialing codes, mobile
   networks, payment methods, races, interests, socials.
   ============================================================ */
(function () {
  'use strict';

  /* [ISO2, Name, Nationality, DialingCode] */
  var C = [
    ["AF","Afghanistan","Afghan","+93"],["AL","Albania","Albanian","+355"],
    ["DZ","Algeria","Algerian","+213"],["AD","Andorra","Andorran","+376"],
    ["AO","Angola","Angolan","+244"],["AG","Antigua and Barbuda","Antiguan or Barbudan","+1268"],
    ["AR","Argentina","Argentine","+54"],["AM","Armenia","Armenian","+374"],
    ["AU","Australia","Australian","+61"],["AT","Austria","Austrian","+43"],
    ["AZ","Azerbaijan","Azerbaijani","+994"],["BS","Bahamas","Bahamian","+1242"],
    ["BH","Bahrain","Bahraini","+973"],["BD","Bangladesh","Bangladeshi","+880"],
    ["BB","Barbados","Barbadian","+1246"],["BY","Belarus","Belarusian","+375"],
    ["BE","Belgium","Belgian","+32"],["BZ","Belize","Belizean","+501"],
    ["BJ","Benin","Beninese","+229"],["BT","Bhutan","Bhutanese","+975"],
    ["BO","Bolivia","Bolivian","+591"],["BA","Bosnia and Herzegovina","Bosnian or Herzegovinian","+387"],
    ["BW","Botswana","Botswanan","+267"],["BR","Brazil","Brazilian","+55"],
    ["BN","Brunei","Bruneian","+673"],["BG","Bulgaria","Bulgarian","+359"],
    ["BF","Burkina Faso","Burkinabé","+226"],["BI","Burundi","Burundian","+257"],
    ["CV","Cabo Verde","Cabo Verdean","+238"],["KH","Cambodia","Cambodian","+855"],
    ["CM","Cameroon","Cameroonian","+237"],["CA","Canada","Canadian","+1"],
    ["CF","Central African Republic","Central African","+236"],["TD","Chad","Chadian","+235"],
    ["CL","Chile","Chilean","+56"],["CN","China","Chinese","+86"],
    ["CO","Colombia","Colombian","+57"],["KM","Comoros","Comorian","+269"],
    ["CG","Congo (Brazzaville)","Congolese","+242"],["CD","Congo (Kinshasa)","Congolese","+243"],
    ["CR","Costa Rica","Costa Rican","+506"],["CI","Côte d'Ivoire","Ivorian","+225"],
    ["HR","Croatia","Croatian","+385"],["CU","Cuba","Cuban","+53"],
    ["CY","Cyprus","Cypriot","+357"],["CZ","Czechia","Czech","+420"],
    ["DK","Denmark","Danish","+45"],["DJ","Djibouti","Djiboutian","+253"],
    ["DM","Dominica","Dominican","+1767"],["DO","Dominican Republic","Dominican","+1809"],
    ["EC","Ecuador","Ecuadorian","+593"],["EG","Egypt","Egyptian","+20"],
    ["SV","El Salvador","Salvadoran","+503"],["GQ","Equatorial Guinea","Equatorial Guinean","+240"],
    ["ER","Eritrea","Eritrean","+291"],["EE","Estonia","Estonian","+372"],
    ["SZ","Eswatini","Swazi","+268"],["ET","Ethiopia","Ethiopian","+251"],
    ["FJ","Fiji","Fijian","+679"],["FI","Finland","Finnish","+358"],
    ["FR","France","French","+33"],["GA","Gabon","Gabonese","+241"],
    ["GM","Gambia","Gambian","+220"],["GE","Georgia","Georgian","+995"],
    ["DE","Germany","German","+49"],["GH","Ghana","Ghanaian","+233"],
    ["GR","Greece","Greek","+30"],["GD","Grenada","Grenadian","+1473"],
    ["GT","Guatemala","Guatemalan","+502"],["GN","Guinea","Guinean","+224"],
    ["GW","Guinea-Bissau","Guinea-Bissaun","+245"],["GY","Guyana","Guyanese","+592"],
    ["HT","Haiti","Haitian","+509"],["HN","Honduras","Honduran","+504"],
    ["HU","Hungary","Hungarian","+36"],["IS","Iceland","Icelandic","+354"],
    ["IN","India","Indian","+91"],["ID","Indonesia","Indonesian","+62"],
    ["IR","Iran","Iranian","+98"],["IQ","Iraq","Iraqi","+964"],
    ["IE","Ireland","Irish","+353"],["IL","Israel","Israeli","+972"],
    ["IT","Italy","Italian","+39"],["JM","Jamaica","Jamaican","+1876"],
    ["JP","Japan","Japanese","+81"],["JO","Jordan","Jordanian","+962"],
    ["KZ","Kazakhstan","Kazakhstani","+7"],["KE","Kenya","Kenyan","+254"],
    ["KI","Kiribati","I-Kiribati","+686"],["KW","Kuwait","Kuwaiti","+965"],
    ["KG","Kyrgyzstan","Kyrgyzstani","+996"],["LA","Laos","Laotian","+856"],
    ["LV","Latvia","Latvian","+371"],["LB","Lebanon","Lebanese","+961"],
    ["LS","Lesotho","Basotho","+266"],["LR","Liberia","Liberian","+231"],
    ["LY","Libya","Libyan","+218"],["LI","Liechtenstein","Liechtensteiner","+423"],
    ["LT","Lithuania","Lithuanian","+370"],["LU","Luxembourg","Luxembourger","+352"],
    ["MG","Madagascar","Malagasy","+261"],["MW","Malawi","Malawian","+265"],
    ["MY","Malaysia","Malaysian","+60"],["MV","Maldives","Maldivian","+960"],
    ["ML","Mali","Malian","+223"],["MT","Malta","Maltese","+356"],
    ["MH","Marshall Islands","Marshallese","+692"],["MR","Mauritania","Mauritanian","+222"],
    ["MU","Mauritius","Mauritian","+230"],["MX","Mexico","Mexican","+52"],
    ["FM","Micronesia","Micronesian","+691"],["MD","Moldova","Moldovan","+373"],
    ["MC","Monaco","Monacan","+377"],["MN","Mongolia","Mongolian","+976"],
    ["ME","Montenegro","Montenegrin","+382"],["MA","Morocco","Moroccan","+212"],
    ["MZ","Mozambique","Mozambican","+258"],["MM","Myanmar","Burmese","+95"],
    ["NR","Nauru","Nauruan","+674"],["NP","Nepal","Nepali","+977"],
    ["NL","Netherlands","Dutch","+31"],["NZ","New Zealand","New Zealander","+64"],
    ["NI","Nicaragua","Nicaraguan","+505"],["NE","Niger","Nigerien","+227"],
    ["NG","Nigeria","Nigerian","+234"],["KP","North Korea","North Korean","+850"],
    ["MK","North Macedonia","Macedonian","+389"],["NO","Norway","Norwegian","+47"],
    ["OM","Oman","Omani","+968"],["PK","Pakistan","Pakistani","+92"],
    ["PW","Palau","Palauan","+680"],["PS","Palestine","Palestinian","+970"],
    ["PA","Panama","Panamanian","+507"],["PG","Papua New Guinea","Papua New Guinean","+675"],
    ["PY","Paraguay","Paraguayan","+595"],["PE","Peru","Peruvian","+51"],
    ["PH","Philippines","Filipino","+63"],["PL","Poland","Polish","+48"],
    ["PT","Portugal","Portuguese","+351"],["QA","Qatar","Qatari","+974"],
    ["RO","Romania","Romanian","+40"],["RU","Russia","Russian","+7"],
    ["RW","Rwanda","Rwandan","+250"],
    ["KN","Saint Kitts and Nevis","Kittitian or Nevisian","+1869"],
    ["LC","Saint Lucia","Saint Lucian","+1758"],
    ["VC","Saint Vincent and the Grenadines","Vincentian","+1784"],
    ["WS","Samoa","Samoan","+685"],["SM","San Marino","San Marinese","+378"],
    ["ST","São Tomé and Príncipe","São Toméan","+239"],["SA","Saudi Arabia","Saudi","+966"],
    ["SN","Senegal","Senegalese","+221"],["RS","Serbia","Serbian","+381"],
    ["SC","Seychelles","Seychellois","+248"],["SL","Sierra Leone","Sierra Leonean","+232"],
    ["SG","Singapore","Singaporean","+65"],["SK","Slovakia","Slovak","+421"],
    ["SI","Slovenia","Slovenian","+386"],["SB","Solomon Islands","Solomon Islander","+677"],
    ["SO","Somalia","Somali","+252"],["ZA","South Africa","South African","+27"],
    ["KR","South Korea","South Korean","+82"],["SS","South Sudan","South Sudanese","+211"],
    ["ES","Spain","Spanish","+34"],["LK","Sri Lanka","Sri Lankan","+94"],
    ["SD","Sudan","Sudanese","+249"],["SR","Suriname","Surinamese","+597"],
    ["SE","Sweden","Swedish","+46"],["CH","Switzerland","Swiss","+41"],
    ["SY","Syria","Syrian","+963"],["TW","Taiwan","Taiwanese","+886"],
    ["TJ","Tajikistan","Tajikistani","+992"],["TH","Thailand","Thai","+66"],
    ["TL","Timor-Leste","Timorese","+670"],["TG","Togo","Togolese","+228"],
    ["TO","Tonga","Tongan","+676"],["TT","Trinidad and Tobago","Trinidadian or Tobagonian","+1868"],
    ["TN","Tunisia","Tunisian","+216"],["TR","Türkiye","Turkish","+90"],
    ["TM","Turkmenistan","Turkmen","+993"],["TV","Tuvalu","Tuvaluan","+688"],
    ["UG","Uganda","Ugandan","+256"],["UA","Ukraine","Ukrainian","+380"],
    ["AE","United Arab Emirates","Emirati","+971"],
    ["GB","United Kingdom","British","+44"],
    ["US","United States","American","+1"],
    ["UY","Uruguay","Uruguayan","+598"],["UZ","Uzbekistan","Uzbek","+998"],
    ["VU","Vanuatu","Vanuatuau","+678"],["VA","Vatican City","Vatican","+39"],
    ["VE","Venezuela","Venezuelan","+58"],["VN","Vietnam","Vietnamese","+84"],
    ["YE","Yemen","Yemeni","+967"],["ZM","Zambia","Zambian","+260"],
    ["ZW","Zimbabwe","Zimbabwean","+263"]
  ];

  /* Country-driven mobile networks */
  var NETWORKS = {
    ZW: ["Econet", "NetOne", "Telecel"],
    BW: ["BTC", "Mascom", "Orange"],
    ZA: ["Vodacom", "MTN", "Cell C", "Telkom Mobile"],
    ZM: ["MTN", "Airtel", "Zamtel"],
    MW: ["Airtel", "TNM"],
    MZ: ["Vodacom", "Movitel", "Tmcel"],
    NA: ["MTC", "Paragon", "Telecom Namibia"],
    KE: ["Safaricom", "Airtel", "Telkom Kenya"],
    TZ: ["Vodacom", "Airtel", "Tigo", "Halotel"],
    UG: ["MTN", "Airtel", "Lyca"],
    NG: ["MTN", "Airtel", "Glo", "9mobile"],
    GH: ["MTN", "Vodafone", "AirtelTigo"],
    GB: ["EE", "O2", "Vodafone", "Three"],
    US: ["AT&T", "T-Mobile", "Verizon"],
    CA: ["Rogers", "Bell", "Telus"],
    AU: ["Telstra", "Optus", "Vodafone"],
    NZ: ["Spark", "Vodafone", "2degrees"]
  };

  /* Country-driven payment methods (config only — not collected at signup) */
  var PAYMENTS = {
    ZW: ["EcoCash", "OneMoney", "ZIPIT"],
    BW: ["Smega", "MyZaka", "Orange Money"],
    ZA: ["M-Pesa", "SnapScan", "Ozow", "PayFast"],
    KE: ["M-Pesa", "Airtel Money"],
    TZ: ["M-Pesa", "Tigo Pesa", "Airtel Money"],
    UG: ["MTN MoMo", "Airtel Money"],
    NG: ["Paystack", "Flutterwave", "OPay"],
    GH: ["MTN MoMo", "Vodafone Cash"],
    ZM: ["MTN Money", "Airtel Money", "Zamtel Kwacha"],
    MW: ["Airtel Money", "TNMpamba"],
    GB: ["Visa", "Mastercard", "PayPal"],
    US: ["Visa", "Mastercard", "PayPal", "Apple Pay"],
    DEFAULT: ["Visa", "Mastercard"]
  };

  window.RegData = {
    countries: C.map(function (r) {
      return { code: r[0], name: r[1], nationality: r[2], dial: r[3] };
    }),
    countryByCode: {},
    networksFor: function (cc) { return NETWORKS[cc] || []; },
    paymentsFor: function (cc) { return PAYMENTS[cc] || PAYMENTS.DEFAULT; },
    races: ["Black", "White", "Mixed", "Asian", "Indian", "Other"],
    interests: [
      "Family", "Genealogy", "Music", "Sport", "Business", "Technology",
      "Education", "Travel", "Food", "Culture", "Arts", "Religion",
      "Community", "History", "Photography", "Film", "Books", "Gaming",
      "Fashion", "Health & Fitness", "Entrepreneurship", "Volunteering",
      "Agriculture", "Science", "Politics", "Finance"
    ],
    educationCategories: [
      { key: "creche", label: "Crèche" },
      { key: "primary", label: "Primary" },
      { key: "secondary", label: "Secondary" },
      { key: "tertiary", label: "Tertiary" }
    ],
    tertiaryTypes: ["University", "College", "Polytechnic", "Technical Institute",
      "Vocational Institute", "Teacher Training", "Medical School", "Other"],
    socials: ["facebook", "x", "instagram", "tiktok", "linkedin", "youtube", "snapchat", "threads", "other"]
  };

  window.RegData.countries.forEach(function (c) { window.RegData.countryByCode[c.code] = c; });
})();
