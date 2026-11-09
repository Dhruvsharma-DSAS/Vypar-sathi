const BUSINESS_WORDS = [
  ["momo", "momo_cart"],
  ["chai", "chai_cart"],
  ["tea", "chai_cart"],
  ["vada", "vada_pav_cart"],
  ["juice", "juice_cart"],
  ["soda", "juice_cart"],
  ["tiffin", "tiffin_service"],
  ["dabba", "tiffin_service"],
  ["silai", "tailoring"],
  ["tailor", "tailoring"],
  ["repair", "phone_repair"],
  ["achaar", "pickles_home"],
  ["pickle", "pickles_home"],
];

const SKILL_WORDS = [
  ["cook", "cooking"],
  ["khana", "cooking"],
  ["khaana", "cooking"],
  ["silai", "tailoring"],
  ["tailor", "tailoring"],
  ["stitch", "tailoring"],
  ["repair", "repair"],
  ["mobile", "repair"],
];

const WORD_AMOUNTS = {'bees':20,'bis':20,'twenty':20,'pachees':25,'pachis':25,'twenty five':25,'tees':30,'tis':30,'thirty':30,'chalis':40,'chaalis':40,'forty':40,'pachaas':50,'pachas':50,'fifty':50,'saath':60,'sixty':60,'sattar':70,'seventy':70,'assi':80,'eighty':80,'sau':100,'hundred':100,'ek':1,'one':1,'do':2,'two':2,'teen':3,'three':3,'paanch':5,'five':5,'बीस':20,'तीस':30,'पच्चीस':25,'पचास':50,'वीस':20,'तीस':30,'पंचवीस':25,'ಇಪ್ಪತ್ತು':20,'ಮೂವತ್ತು':30};
export function readMoney(text) {
  let low = text.toLowerCase().replace(/,/g, '').replace(/[०-९]/g,c=>String(c.charCodeAt(0)-2406));
  for(const [word,value] of Object.entries(WORD_AMOUNTS).sort((a,b)=>b[0].length-a[0].length)){
    low=low.replace(new RegExp('(?<![\\p{L}])'+word+'(?![\\p{L}])','gu'),String(value));
  }
  const match=low.match(/(\d+(?:\.\d+)?)\s*(lakhs?|lac|लाख|hazaar|hazar|thousand|हजार|हज़ार|ಸಾವಿರ|k)(?![a-z])/i) || low.match(/(\d+(?:\.\d+)?)/);
  if(!match)return null;
  let value=Number(match[1]);
  if(['lakh','lakhs','lac','लाख'].includes(match[2]))value*=100000;
  else if(match[2])value*=1000;
  return Number.isFinite(value)?Math.round(value):null;
}

export function readBusiness(text) {
  const low = text.toLowerCase();
  const alias = [["मोमो","momo_cart"],["चाय","chai_cart"],["चहा","chai_cart"],["ಟೀ","chai_cart"],["टिफिन","tiffin_service"],["वडा","vada_pav_cart"],["सिलाई","tailoring"],["शिवण","tailoring"],["जूस","juice_cart"]].find(([word])=>low.includes(word));
  if(alias)return alias[1];
  const found = BUSINESS_WORDS.find((pair) => low.includes(pair[0]));
  if (found) {
    return found[1];
  }
  return null;
}

export function readSkill(text) {
  const low = text.toLowerCase();
  if(/खाना|खाना बनाना|खाना बनाना|स्वयंपाक|ಅಡುಗೆ/.test(low))return "cooking";
  if(/सिलाई|शिवण|ಹೊಲಿಗೆ/.test(low))return "tailoring";
  if(/no skill|none|no specific|कोई नहीं/.test(low))return "none";
  const found = SKILL_WORDS.find((pair) => low.includes(pair[0]));
  if (found) {
    return found[1];
  }
  return null;
}

export function readHours(text) {
  const low = text.toLowerCase();
  const morning = low.includes("subah") || low.includes("morning") || /सुबह|सकाळ|ಬೆಳಿಗ್ಗೆ/.test(low);
  const evening = low.includes("shaam") || low.includes("evening") || low.includes("raat") || low.includes("night") || /शाम|संध्याकाळ|ಸಂಜೆ/.test(low);
  const lunch = low.includes("dopahar") || low.includes("lunch") || low.includes("afternoon") || /दोपहर|दुपार|ಮಧ್ಯಾಹ್ನ/.test(low);
  if (morning && evening) {
    return "both";
  }
  if (morning) {
    return "morning";
  }
  if (evening) {
    return "evening";
  }
  if (lunch) {
    return "lunch";
  }
  if (low.includes("full") || low.includes("pura din") || low.includes("both") || /पूरा दिन|पूर्ण दिवस|ಇಡೀ ದಿನ/.test(low)) {
    return "both";
  }
  return null;
}

export function readYesNo(text) {
  const low = text.toLowerCase();
  if (/(?:^|\s)(?:nahi|nahin|no|not|नहीं|नाही|नको|ಇಲ್ಲ)(?:\s|$)/u.test(low)) return false;
  if (/(?:^|\s)(?:haan|han|ha|yes|हाँ|हां|हो|ಹೌದು)(?:\s|$)/u.test(low) || low.includes('chahiye'))return true;
  return null;
}

export function readWard(text, wards) {
  const low = text.toLowerCase();
  const found = wards.find((w) => low.includes(w.name.toLowerCase()));
  if (found) {
    return found.ward_id;
  }
  return null;
}
