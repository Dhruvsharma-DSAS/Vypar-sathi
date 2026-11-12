"use client";
import {useEffect,useState,useMemo,lazy,Suspense} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {BUSINESS_GROUPS,categoryLabel,compareCells,economics,evidenceCSV,mappedCategories} from '../lib/analyser.js';
import {rupees} from '../lib/money.js';
import Icon from './Icon.jsx';
const CityAtlas=lazy(()=>import('./CityAtlas.jsx'));
const sortOptions = [
  ["share", "Lowest category share"],
  ["coverage", "Most mapped objects"],
  ["context", "Most context anchors"],
];
export default function LocalityAnalyser({ profile, common, cityData }) {
  const [params, setParams] = useSearchParams();
  const category = params.get("group") ?? "food";
  const sort = sortOptions.find(([key]) => key === params.get("sort"))?.[0] ?? "coverage";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState("compare");
  const [selected, setSelected] = useState("");
  const [page, setPage] = useState(0);
  const [business, setBusiness] = useState(profile.businessId || common.types[0].id);
  const [sales, setSales] = useState(70);
  const [cost, setCost] = useState(15);

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    fetch(`/data/real/${profile.city}_map.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the city snapshot.");
        return response.json();
      })
      .then((snapshot) => { if (active) setData(snapshot); })
      .catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [profile.city, retry]);

  const categoryOptions = useMemo(() => mappedCategories(data?.density ?? []), [data]);
  const requestedTag = category.startsWith("tag:") ? category.slice(4) : "";
  const activeTag = categoryOptions.some(([name]) => name === requestedTag) ? requestedTag : "";
  const activeGroup = BUSINESS_GROUPS.find((group) => group.id === category)
    ?? (activeTag ? null : BUSINESS_GROUPS[0]);
  const activeCategory = activeGroup?.id ?? category;
  const activeLabel = activeGroup?.label ?? categoryLabel(activeTag);
  const rows = useMemo(() => {
    const cells = compareCells(data?.density ?? [], activeGroup?.tags ?? [activeTag]);
    if (sort === "coverage") return cells.sort((first, second) => second.count - first.count);
    if (sort === "context") return cells.sort((first, second) => second.anchors - first.anchors);
    return cells;
  }, [data, activeGroup, activeTag, sort]);
  const categoryTags = activeGroup?.tags ?? [activeTag];

  useEffect(() => {
    setPage(0);
    setSelected("");
  }, [category, sort, data]);

  function setFilter(key, value) {
    const next = new URLSearchParams(window.location.search);
    next.set(key, value);
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function downloadEvidence() {
    const groupId = activeGroup?.id ?? activeTag;
    const csv = evidenceCSV(rows, profile.city, data.retrieved_at_utc, groupId);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profile.city}-${groupId.replace(/[^a-z0-9_-]/gi, "-")}-mapped-evidence.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const chosen = rows.find((row) => row.lat + "," + row.lng === selected) ?? rows[page * 12] ?? rows[0];
  const t = common.types.find((item) => item.id === business) ?? common.types[0];
  const base = economics(t, common, profile.city);
  const stress = economics(t, common, profile.city, { sales: sales / 100, costRise: cost / 100 });

  return <div className="locality-lab"><div className="lab-method"><span><b>01</b> Compare supply</span><Icon name="chevron" size={15}/><span><b>02</b> Stress-test cash</span><Icon name="chevron" size={15}/><span><b>03</b> Validate on the street</span></div><div className="lab-tabs" aria-label="Analysis views">{[['compare','Compare areas'],['stress','Stress-test'],['validate','Evidence checklist'],['map','Maps & layers']].map(([id,label])=><button key={id} aria-pressed={tab===id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</div>{tab==='compare'&&<><div className="lab-intro"><h2>Compare mapped supply</h2><p>Compare equal 0.01° grid cells (about 1 km across). Lower category share is a starting point for field research; it does not establish unmet demand.</p></div><div className="lab-filters">
  <div className="lab-filter-fields">
    <label>Business group<select value={activeCategory} onChange={e=>setFilter('group',e.target.value)}>
      <optgroup label="Business groups">
        {BUSINESS_GROUPS.map(({id,label})=><option key={id} value={id}>{label}</option>)}
      </optgroup>
      {categoryOptions.length>0&&<optgroup label="Individual map categories">
        {categoryOptions.map(([name])=><option key={name} value={'tag:'+name}>{categoryLabel(name)}</option>)}
      </optgroup>}
    </select></label>
    <label>Compare by<select value={sort} onChange={e=>setFilter('sort',e.target.value)}>
      {sortOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select></label>
  </div>
  <p className="lab-group-description"><strong>{activeLabel}</strong>{activeGroup&&<span>{categoryTags.map(categoryLabel).join(' · ')}</span>}</p>
  <div className="lab-filter-actions">
    <button className="button secondary" disabled={!data||!rows.length} onClick={downloadEvidence}><Icon name="download" size={15}/>Export evidence</button>
    <span className="snapshot-badge">{data?'Snapshot · '+new Date(data.retrieved_at_utc).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Snapshot pending'}</span>
  </div>
</div>{error?<div role="alert" className="market-empty"><p>{error}</p><button className="button secondary" onClick={()=>setRetry(x=>x+1)}>Retry snapshot</button></div>:!data?<div className="skeleton skeleton-hero" role="status">Loading mapped evidence…</div>:!rows.length?<div className="market-empty">No cells meet the minimum of 10 mapped objects.</div>:<div className="evidence-grid"><div className="area-list"><div className="area-list-heading"><b>{rows.length} comparable cells</b><small>Cells {page*12+1}–{Math.min(page*12+12,rows.length)} · observed mapping only</small></div>{rows.slice(page*12,page*12+12).map((r,i)=><button key={r.lat+','+r.lng} className={r===chosen?'selected':''} onClick={()=>setSelected(r.lat+','+r.lng)}><span className="area-number">{String(page*12+i+1).padStart(2,'0')}</span><span><b>{r.landmark?.name||`Cell ${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`}</b><small>{r.lat.toFixed(3)}° N · {r.lng.toFixed(3)}° E</small><small>{r.peers} category objects / {r.count} mapped objects</small></span><strong>{(r.share*100).toFixed(1)}%<small>category share</small></strong></button>)}<div className="cell-pagination"><button disabled={page===0} onClick={()=>{setPage(page-1);setSelected('')}}>Previous</button><span>{page+1} / {Math.ceil(rows.length/12)}</span><button disabled={(page+1)*12>=rows.length} onClick={()=>{setPage(page+1);setSelected('')}}>Next</button></div></div><aside className="evidence-dossier"><span className="market-eyebrow">THE EVIDENCE, UNPACKED</span><h3>{chosen.landmark?.name||'Selected grid cell'}</h3><p>Mapped reference within this cell · not an area name. {chosen.lat.toFixed(3)}° N, {chosen.lng.toFixed(3)}° E.</p><div className="dossier-stat"><strong>{chosen.peers}</strong><span>mapped category objects in this cell</span></div><dl><div><dt>All mapped objects</dt><dd>{chosen.count}</dd></div><div><dt>Category share</dt><dd>{(chosen.share*100).toFixed(1)}%</dd></div><div><dt>Context anchors</dt><dd>{chosen.anchors}</dd></div></dl><p>Anchors = mapped schools, colleges, hospitals and banks. Counts describe mapped supply, not unique shops, customers or activity.</p><div className="evidence-warning"><Icon name="info" size={18}/><span>Footfall, rent, willingness to pay and unmapped competitors are unknown.</span></div><a className="button secondary" target="_blank" rel="noreferrer" href={'https://www.openstreetmap.org/#map=15/'+chosen.lat+'/'+chosen.lng}>Inspect this location <Icon name="arrow" size={16}/></a></aside></div>}<details className="method-details"><summary>How this comparison works</summary><p>Source: all {data?.total?.toLocaleString('en-IN')||'available'} downloaded OpenStreetMap objects for this city, grouped into 0.01° cells. Cells with fewer than 10 objects are excluded. Category share = category objects ÷ all mapped objects. Sorting uses that ratio, mapped count, or anchor count. Reference names are named objects from the same CSV cell, prioritising a school, college or hospital when one is mapped. They are not verified trading locations. Zero category objects can reflect incomplete mapping. No population estimates, star ratings or generated footfall are used.</p><p>Business groups combine related map categories. Electronics and vehicle groups can include retailers as well as repair services. Individual categories use the source tags as recorded. Objects may describe the same business more than once.</p></details></>}{tab==='stress'&&<section className="stress-panel"><div className="lab-intro"><h2>Does the plan survive a difficult month?</h2><p>Change one assumption at a time. Compare your scenario against the same template at 26 operating days.</p></div><div className="stress-controls"><label>Business template<select value={business} onChange={e=>setBusiness(e.target.value)}>{common.types.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label>Sales volume: {sales}% of template<input aria-label="Sales volume percent" type="range" min="20" max="130" step="5" value={sales} onChange={e=>setSales(Number(e.target.value))}/><small>Template: {t.typical_units_per_day} {t.unit}s/day; scenario: {(t.typical_units_per_day*sales/100).toFixed(1)}</small></label><label>Input cost increase: {cost}%<input aria-label="Input cost increase percent" type="range" min="0" max="50" step="5" value={cost} onChange={e=>setCost(Number(e.target.value))}/></label></div><div className="stress-results"><div><small>BASE OPERATING PROFIT</small><strong>{rupees(base.profit)}</strong><span>Template sales and costs</span></div><div><small>YOUR SCENARIO</small><strong>{rupees(stress.profit)}</strong><span>{stress.profit<0?'Loss under these assumptions':'Positive before tax, EMI and owner’s pay'}</span></div><div><small>SCENARIO BREAK-EVEN</small><strong>{stress.breakEven??'No positive margin'}</strong><span>{t.unit}s per operating day</span></div></div><p className="source-line">These are editable planning assumptions, not measured earnings. Startup investment is separate from operating profit. <Link to="/cost">Edit price and fixed costs in the money planner →</Link></p></section>}{tab==='validate'&&<section className="validation-panel"><div className="lab-intro"><h2>Turn a promising hypothesis into evidence.</h2><p>Your next step is to collect what the map cannot tell you.</p></div>{[['Count people at your exact spot','Observe three 15-minute windows on a weekday and weekend. Record time, conditions and count.'],['Check the real competition','Walk the surrounding streets. Include mobile carts and businesses missing from the map.'],['Get written cost quotes','Confirm rent, deposit, ingredients, transport, permission requirements and electricity.'],['Run a small seven-day pilot','Record actual units sold, selling price, variable costs, waste and daily fixed expenses.']].map(([title,desc],i)=><div className="validation-row" key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{desc}</p></div><Icon name="check" size={20}/></div>)}<Link className="button primary" to="/plan">Record your pilot <Icon name="arrow" size={16}/></Link></section>}{tab==='map'&&<Suspense fallback={<div role="status" className="skeleton skeleton-hero">Loading map…</div>}><CityAtlas city={profile.city} shapes={cityData.shapes} expanded/></Suspense>}</div>}
