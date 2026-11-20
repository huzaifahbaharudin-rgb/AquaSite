"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ScenarioHandoff } from "@/lib/scenario/schema";
import "./impact.css";
import HandoffPreview from "./HandoffPreview";
const fmt = (v:number) => new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(v);
const money = (v:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
function Spark({values,secondary}:{values:number[],secondary?:number[]}) {
 const w=700,h=178,p=12,max=Math.max(1,...values,...(secondary||[]))*1.12;
 const path=(v:number[])=>v.map((x,i)=>`${i?'L':'M'}${p+i*(w-2*p)/Math.max(1,v.length-1)},${h-p-x/max*(h-2*p)}`).join(' ');
 return <svg className="aq-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Projected annual water use over the facility lifespan"><path d={`M${p} ${h-p}H${w-p}`} stroke="#405769" strokeWidth="1" fill="none"/>{[.25,.5,.75].map(x=><path key={x} d={`M${p} ${h-p-x*(h-2*p)}H${w-p}`} stroke="#294051" strokeDasharray="4 6"/>)}{secondary&&<path d={path(secondary)} stroke="#6f8fa8" strokeWidth="2.5" fill="none" strokeDasharray="7 5"/>}<path d={path(values)} stroke="#6de1cd" strokeWidth="3.5" fill="none" strokeLinecap="round"/></svg>;
}
export default function ImpactModule({handoff:h}:{handoff:ScenarioHandoff}) {
 const [householdDaily,setHouseholdDaily]=useState(0.55);
 const [waterPrice,setWaterPrice]=useState(1.5);
 const [priceShock,setPriceShock]=useState(30);
 const [outageDays,setOutageDays]=useState(3);
 const [outageCost,setOutageCost]=useState(250000);
 const [permitDays,setPermitDays]=useState(30);
 const [delayCost,setDelayCost]=useState(30000);
 const [dryFactor,setDryFactor]=useState(0.75);
 const m=h.metrics,annual=m.annualOnsiteWater.value,daily=m.averageDailyOnsiteWater.value;
 const households=daily/householdDaily;
 const peak=m.peakDayOnsiteWater?.value??null;
 const reclaimed=h.core.reclaimedSharePct;
 const nonReclaimed=m.annualNonReclaimedOnsite.value;
 // Automated, reproducible DEMO screening based on the selected coordinates and
 // nearby mapped features. No official polygon overlay or Aqueduct lookup is bundled.
 // A proximity flag is NOT proof of intersection with a protected area.
 const hasCoordinates=Number.isFinite(h.site.lat)&&Number.isFinite(h.site.lon);
 const protectedNearby=h.site.nearby.filter(n=>n.layer==='protected').sort((a,b)=>a.distanceKm-b.distanceKm);
 const nearestProtected=protectedNearby[0];
 const region=(h.site.region||'').toLowerCase();
 const basinProxy:'moderate'|'high' = /johor|malaysia|singapore/.test(region)?'moderate':'moderate';
 const regulatoryStatus:'pending'|'missing'=hasCoordinates?'pending':'missing';
 const waterStress=basinProxy;
 const drivers:{label:string,points:number,detail:string}[]=[];
 if(h.core.wueLPerKwh>1.5)drivers.push({label:"Water-intensive cooling",points:22,detail:`WUE ${h.core.wueLPerKwh.toFixed(2)} L/kWh`});
 else if(h.core.wueLPerKwh>0.6)drivers.push({label:"Moderate cooling demand",points:11,detail:`WUE ${h.core.wueLPerKwh.toFixed(2)} L/kWh`});
 if(reclaimed<20)drivers.push({label:"Limited reclaimed-water supply",points:17,detail:`${reclaimed}% reclaimed`});
 else if(reclaimed<50)drivers.push({label:"Reclaimed supply could increase",points:8,detail:`${reclaimed}% reclaimed`});
 drivers.push({label:"Moderate basin water stress",points:12,detail:"Regional demonstration proxy; not verified basin data"});
 if(peak&&peak>daily*1.5)drivers.push({label:"High peak-day demand",points:9,detail:`${(peak/daily).toFixed(1)}× average`});
 const nearProtected=h.site.nearby.filter(n=>n.layer==='protected').sort((a,b)=>a.distanceKm-b.distanceKm)[0];
 if(nearProtected&&nearProtected.distanceKm<2)drivers.push({label:"Protected-area proximity needs review",points:8,detail:`${nearProtected.distanceKm.toFixed(1)} km mapped distance; not proof of overlap`});
 const score=clamp(100-drivers.reduce((a,d)=>a+d.points,0),0,100);
 const grade=regulatoryStatus==='missing'?'D':score>=80?'A':score>=55?'B':'C';
 const gradeText=grade==='A'?'Low exposure':grade==='B'?'Conditional':grade==='C'?'High risk exposure':'Insufficient data';
 const forecast=m.trajectory.length?m.trajectory:[{year:h.startYear,onsiteWaterM3:annual,gridWaterM3:m.annualGridWater.value,reclaimedSuppliedM3:m.annualReclaimedSupplied.value}];
 const annualPriceExposure=nonReclaimed*waterPrice*(priceShock/100);
 const disruption=outageDays*outageCost;
 const delay=permitDays*delayCost;
 const exposure=annualPriceExposure+disruption+delay;
 const yearLabels=[forecast[0]?.year,forecast[Math.floor((forecast.length-1)/2)]?.year,forecast[forecast.length-1]?.year];
 const yearSeason=[.83,.9,1.05,1.18,1.15,1.06,1.01,.99,1.04,1.13,1.0,.66];
 const seasonal=yearSeason.map(x=>annual/12*x);
 const monthlySupply=annual/12*dryFactor;
 const monthlyMax=Math.max(...seasonal,monthlySupply,1);
 const downloadable=()=>{const blob=new Blob([JSON.stringify({scenario:h,assessment:{score,grade,regulatoryStatus,waterStress,screeningBasis:"illustrative location proxy; official checks pending",assumptions:{householdDaily,waterPrice,priceShock,outageDays,outageCost,permitDays,delayCost,dryFactor},financialExposureUSD:exposure}},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aquasite-impact-assessment.json';a.click();URL.revokeObjectURL(a.href);};
 return <main className="aq-impact">
  <div className="aq-heading"><div><div className="aq-kicker">STEP 03 / IMPACT ASSESSMENT</div><h1>Water impact & risk</h1><p>{h.site.name} · {h.core.itCapacityMw} MW · {h.core.lifespanYears}-year assessment</p></div><div className="aq-actions"><Link className="btn ghost" href="/configure">← Edit scenario</Link><button className="btn" onClick={downloadable}>Export assessment</button></div></div>
  <div className="aq-hero">
   <article className={`aq-tile aq-class aq-grade-${grade}`}><div className="aq-tile-label">AQUA CLASS</div><div className="aq-grade">{grade}</div><strong>{gradeText}</strong><small>{grade==='D'?'Site coordinates are missing.':grade==='A'?'Provisional low risk; official restrictions not checked.':grade==='B'?'Approval may be possible with mitigation.':'Elevated exposure to regulatory or project delays.'}</small></article>
   <article className="aq-tile aq-score"><div className="aq-tile-label">AQUASITE SCORE <span>PROVISIONAL</span></div><div className="aq-number">{score}<em>/100</em></div><div className="aq-scoretrack"><span style={{width:`${score}%`}}/></div><small>Water-risk screening score, not a credit rating or official approval</small></article>
   <article className="aq-tile"><div className="aq-tile-label">VOLUMETRIC FOOTPRINT</div><div className="aq-number">{fmt(annual)}</div><strong>m³ / year on-site</strong><small>{fmt(m.lifetimeOnsiteWater.value)} m³ lifetime · grid water reported separately</small></article>
   <article className="aq-tile"><div className="aq-tile-label">HOUSEHOLD EQUIVALENT</div><div className="aq-number">{fmt(households)}</div><strong>households / day</strong><small>At {householdDaily} m³ per household per day (editable assumption)</small></article>
  </div>
  <div className="aq-section-title"><span>01</span><div><h2>Financial exposure</h2><p>Understand the financial consequences of water and permitting risks.</p></div></div>
  <div className="aq-single">
   <section className="aq-panel"><div className="aq-panelhead"><div><h2>Financial value at risk</h2><p>Scenario exposure, USD · not a probability-weighted forecast</p></div></div><div className="aq-money">{money(exposure)}</div><div className="aq-breakdown"><div><span>Annual water price shock</span><b>{money(annualPriceExposure)}</b></div><div><span>Operational disruption</span><b>{money(disruption)}</b></div><div><span>Permitting delay</span><b>{money(delay)}</b></div></div><details className="aq-details"><summary>Adjust financial assumptions</summary><div className="aq-inputs"><label>Water price (USD/m³)<input type="number" min="0" step="0.1" value={waterPrice} onChange={e=>setWaterPrice(Math.max(0,+e.target.value||0))}/></label><label>Price increase (%)<input type="number" min="0" value={priceShock} onChange={e=>setPriceShock(Math.max(0,+e.target.value||0))}/></label><label>Disruption days<input type="number" min="0" value={outageDays} onChange={e=>setOutageDays(Math.max(0,+e.target.value||0))}/></label><label>Cost per disrupted day (USD)<input type="number" min="0" value={outageCost} onChange={e=>setOutageCost(Math.max(0,+e.target.value||0))}/></label><label>Permit delay days<input type="number" min="0" value={permitDays} onChange={e=>setPermitDays(Math.max(0,+e.target.value||0))}/></label><label>Cost per delayed day (USD)<input type="number" min="0" value={delayCost} onChange={e=>setDelayCost(Math.max(0,+e.target.value||0))}/></label></div></details><p className="aq-note">Formula: non-reclaimed on-site water × tariff × price shock + interruption days × daily loss + permit-delay days × daily carrying cost. The default inputs are editable examples; the sum mixes an annual recurring cost with one-off event losses and is not a discounted lifetime VaR.</p></section>
  </div>
  <div className="aq-section-title"><span>02</span><div><h2>Risk assessment</h2><p>Risk drivers, regulatory restrictions and data gaps.</p></div></div>
  <div className="aq-single">
   <section className="aq-panel"><div className="aq-panelhead"><div><h2>Risk drivers</h2><p>What is pulling the score down</p></div><span className="aq-chip">{drivers.length} flagged</span></div>{drivers.length?drivers.map(d=><div className="aq-driver" key={d.label}><div><b>{d.label}</b><small>{d.detail}</small></div><strong>−{d.points}</strong></div>):<p className="aq-empty">No numerical risk drivers flagged by this screening model.</p>}
    <div className="aq-rule"/><div className="aq-panelhead"><div><h2>Automatic location screening</h2><p>Derived from the site selected in Step 1 — no developer self-certification</p></div></div>
    <div className="aq-driver"><div><b>Selected site</b><small>{h.site.name} · {h.site.lat.toFixed(4)}, {h.site.lon.toFixed(4)}</small></div><strong>Mapped</strong></div>
    <div className="aq-driver"><div><b>Protected features</b><small>{nearestProtected?`${nearestProtected.name}, ${nearestProtected.distanceKm.toFixed(1)} km away (${nearestProtected.precision})`:'No protected feature in bundled nearby list'}. Proximity cannot establish legal overlap.</small></div><strong>Review</strong></div>
    <div className="aq-driver"><div><b>Basin water stress</b><small>Moderate demonstration proxy; no verified catchment lookup available</small></div><strong>Estimated</strong></div>
    <div className="aq-driver"><div><b>Government restrictions & zoning</b><small>Official parcel boundaries, land-use rules and water permits not yet connected</small></div><strong>Pending</strong></div>
    <p className="aq-note">Class {grade} is provisional, based on available scenario inputs and mapped proximity. It is NOT an approval, clearance or proof that protected land is avoided. Once authoritative restriction polygons are connected, verified prohibited-site intersections must override the score to Class C / NO-GO. Class D applies when essential site coordinates are missing; missing regulatory verification remains explicitly flagged rather than being silently treated as clear.</p>
   </section>
  </div>
  <div className="aq-section-title"><span>03</span><div><h2>Water analysis</h2><p>Seasonal demand and water use over the facility lifespan.</p></div></div>
  <div className="aq-two">
   <section className="aq-panel"><div className="aq-panelhead"><div><h2>Seasonal water balance</h2><p>Illustrative monthly demand vs assumed dry-season supply</p></div><span className="aq-chip">12 months</span></div><div className="aq-bars">{seasonal.map((v,i)=><div className="aq-barcol" key={i}><div className="aq-bar" style={{height:`${100*v/monthlyMax}%`}} title={`${fmt(v)} m³ demand`}/><div className="aq-supply" style={{bottom:`${100*monthlySupply/monthlyMax}%`}}/><span>{'JFMAMJJASOND'[i]}</span></div>)}</div><div className="aq-legend"><span><i className="aq-legend-demand"/>Demand</span><span><i className="aq-legend-supply"/>Assumed supply</span></div><div className="aq-mini"><div><small>Average demand</small><b>{fmt(annual/12)} m³/mo</b></div><div><small>Dry-season supply</small><b>{fmt(monthlySupply)} m³/mo</b></div></div><label className="aq-field">Assumed dry-season supply / average monthly demand <input type="range" min="40" max="130" value={dryFactor*100} onChange={e=>setDryFactor(Number(e.target.value)/100)}/><span>{Math.round(dryFactor*100)}%</span></label><p className="aq-note">The seasonal curve is illustrative, not a rainfall or utility forecast. Replace it with verified monthly catchment supply and demand to assess actual deficits.</p></section>
   <section className="aq-panel"><div className="aq-panelhead"><div><h2>Lifespan forecast</h2><p>Projected annual water use · {h.startYear}–{h.startYear+h.core.lifespanYears-1}</p></div><span className="aq-chip">{h.core.lifespanYears} years</span></div><Spark values={forecast.map(x=>x.onsiteWaterM3)} secondary={forecast.map(x=>x.gridWaterM3)}/><div className="aq-years">{yearLabels.map((y,i)=><span key={i}>{y}</span>)}</div><div className="aq-legend"><span><i className="aq-legend-demand"/>On-site water</span><span><i className="aq-legend-grid"/>Grid water (off-site)</span></div><div className="aq-mini"><div><small>Year 1 on-site</small><b>{fmt(forecast[0].onsiteWaterM3)} m³</b></div><div><small>Final year on-site</small><b>{fmt(forecast[forecast.length-1].onsiteWaterM3)} m³</b></div></div><p className="aq-note">Uses the configured WUE and reclaimed-water trajectory. Grid-related water is shown separately and excluded from local water totals.</p></section>
  </div>
  <div className="aq-section-title"><span>04</span><div><h2>Existing impact analysis</h2><p>Original site, engineering inputs, computed metrics and data provenance.</p></div></div>
  <section className="aq-original"><HandoffPreview handoff={h}/></section>
  <div className="aq-footer"><label>Household demand assumption (m³/day) <input type="number" min="0.05" step="0.05" value={householdDaily} onChange={e=>setHouseholdDaily(Math.max(.05,+e.target.value||.05))}/></label><span>Illustrative decision-support screening only · no automated planning approval, legal clearance or verified financial risk forecast.</span></div>
 </main>;
}
