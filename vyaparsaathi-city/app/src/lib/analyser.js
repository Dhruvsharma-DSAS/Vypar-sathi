import {startupTotal, unitCost} from './money.js';
export const CATEGORIES = [
  { id: "all", name: "All ideas", icon: "shop" },
  { id: "food", name: "Food & snacks", icon: "food" },
  { id: "drinks", name: "Chai & drinks", icon: "cup" },
  { id: "home", name: "From home", icon: "home" },
  { id: "services", name: "Services", icon: "tools" },
  { id: "retail", name: "Retail", icon: "shop" },
];

export function categoryOf(template) {
  if (template.model === "home") return "home";
  if (template.category === "tea_stall") return "drinks";
  if (["tailor", "phone_repair", "salon", "laundry"].includes(template.category)) return "services";
  if (["grocery", "fruit_veg", "stationery"].includes(template.category)) return "retail";
  return "food";
}

export function economics(t,common,city,{days=26,sales=1,costRise=0}={}){const cost=unitCost(common.recipes[t.recipe],common.mandi[city]).total*(1+costRise);const contribution=t.price-cost;return {cost,contribution,startup:startupTotal(t),cashNeeded:startupTotal(t)+t.monthly_fixed,breakEven:contribution>0?Math.ceil(t.monthly_fixed/days/contribution):null,profit:contribution*t.typical_units_per_day*sales*days-t.monthly_fixed};}
export function compareCells(cells,categories){return cells.filter(c=>c.count>=10).map(c=>{const peers=categories.reduce((n,k)=>n+(c.categories[k]||0),0);return {...c,peers,share:peers/c.count,anchors:['school','college','hospital','bank'].reduce((n,k)=>n+(c.categories[k]||0),0)}}).sort((a,b)=>a.share-b.share||b.count-a.count)}

export function evidenceCSV(rows,city,retrieved,group){const safe=value=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};return [['city','latitude_center','longitude_center','reference_object','category_group','mapped_category_objects','all_mapped_objects','category_share_pct','mapped_context_anchors','retrieved_at_utc','source','limitations'],...rows.map(r=>[city,r.lat.toFixed(3),r.lng.toFixed(3),r.landmark?.name||'',group,r.peers,r.count,(r.share*100).toFixed(2),r.anchors,retrieved,'OpenStreetMap contributors / ODbL-1.0','Grid snapshot; mapping coverage varies; not demand or footfall'])].map(row=>row.map(safe).join(',')).join('\r\n')+'\r\n'}

export const BUSINESS_GROUPS = [
  { id: "food", label: "Food & meals", tags: ["restaurant", "fast_food", "food_court", "snacks"] },
  { id: "drinks", label: "Cafés & drinks", tags: ["cafe", "tea", "coffee", "juice", "beverages"] },
  { id: "bakery", label: "Bakeries & sweets", tags: ["bakery", "confectionery", "chocolate", "ice_cream"] },
  { id: "grocery", label: "Groceries & produce", tags: ["supermarket", "convenience", "greengrocer", "grocery", "dairy"] },
  { id: "tailoring", label: "Clothing & tailoring", tags: ["tailor", "clothes", "boutique", "fabric"] },
  { id: "repair", label: "Electronics & repair", tags: ["mobile_phone", "mobile_phone_repair", "electronics", "computer", "appliance"] },
  { id: "beauty", label: "Salons & beauty", tags: ["hairdresser", "beauty", "cosmetics"] },
  { id: "laundry", label: "Laundry & cleaning", tags: ["laundry", "dry_cleaning"] },
  { id: "printing", label: "Print & stationery", tags: ["stationery", "copyshop", "books"] },
  { id: "pharmacy", label: "Pharmacies & chemists", tags: ["pharmacy", "chemist"] },
  { id: "hardware", label: "Hardware & electrical", tags: ["hardware", "electrical", "doityourself"] },
  { id: "vehicles", label: "Vehicle & cycle services", tags: ["bicycle", "bicycle_repair", "car_repair", "car_parts", "motorcycle_repair"] },
];

export function categoryLabel(tag) {
  const label = tag.replaceAll("_", " ").replaceAll(";", " / ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function mappedCategories(cells) {
  const totals = new Map();
  for (const { categories } of cells) {
    for (const [tag, count] of Object.entries(categories)) {
      totals.set(tag, (totals.get(tag) ?? 0) + count);
    }
  }
  return [...totals].sort(([a], [b]) => categoryLabel(a).localeCompare(categoryLabel(b)));
}
