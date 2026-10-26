import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile, FileBlob } from '@oai/artifact-tool';
import { finalizePresentation, applyPresentationChartFont } from '/Users/arnavdeshpande/.codex/plugins/cache/openai-primary-runtime/presentations/26.1024.11018/skills/presentations/container_tools/artifact_tool_utils.mjs';
const ROOT='/Users/arnavdeshpande/Engineering DB/SIH26/VajraSetu';
const BUILD=ROOT+'/.tenet-presentation-build/revision-2';
const SKILL='/Users/arnavdeshpande/.codex/plugins/cache/openai-primary-runtime/presentations/26.1024.11018/skills/presentations';
const FONT='Avenir Next';
const C={navy:'#0A2038',ivory:'#F5F2EA',ink:'#142B43',blue:'#2363DA',muted:'#526574',light:'#BDCEDD',amber:'#E8B563',line:'#D3D9D9',box:'#173750',white:'#FFFFFF'};
const p=Presentation.create({slideSize:{width:1280,height:720}});
const original='https://www.canva.com/design/DAHVkQadZBA/8sKx2MfSjISZCmg6W30OqA/edit';
const repo='https://github.com/aaryanadiger/VajraSetu';
const brochure='/Users/arnavdeshpande/Downloads/Khoj_brochure_linked_v2.pdf';
function txt(s,text,x,y,w,h,size=24,color=C.ink,bold=false,align='left'){
 const sh=s.shapes.add({geometry:'textbox',name:text.replace(/\n/g,' ').slice(0,70),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=text;sh.text.style={fontSize:size,typeface:FONT,color,bold,alignment:align,verticalAlignment:'top',autoFit:'none',wrap:'square',insets:0};return sh;
}
function rule(s,x,y,w,color=C.line){s.shapes.add({geometry:'line',position:{left:x,top:y,width:w,height:0},line:{fill:color,width:1}});}
function slide(dark=false){const s=p.slides.add();s.background.fill=dark?C.navy:C.ivory;return s;}
function footer(s,n,dark=false,source=''){if(source)txt(s,source,54,674,1115,25,12.8,dark?C.light:C.muted);txt(s,String(n).padStart(2,'0'),1176,674,50,25,14,dark?C.light:C.muted,false,'right');}
async function img(s,file,x,y,w,h,fit='cover'){const b=await fs.readFile(ROOT+'/.tenet-presentation-build/assets/'+file);return s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:'AI-generated product concept illustration',position:{left:x,top:y,width:w,height:h},fit});}
function node(s,label,x,y,w,h,{dark=false,diamond=false,accent=false,size=20}={}){
 const sh=s.shapes.add({geometry:diamond?'diamond':'roundRect',name:label,position:{left:x,top:y,width:w,height:h},fill:accent?C.blue:(dark?C.box:'#E7ECED'),line:{fill:dark?'#476377':'#A7B8C4',width:1},borderRadius:diamond?undefined:7});
 if(diamond)txt(s,label,x+7,y+27,w-14,h-50,size,dark?C.white:C.ink,true,'center');
 else{sh.text=label;sh.text.style={typeface:FONT,fontSize:size,color:dark||accent?C.white:C.ink,bold:true,alignment:'center',verticalAlignment:'middle',insets:10,autoFit:'none'};}
 return sh;
}
function edge(s,a,b,from='right',to='left',dark=false){s.shapes.connect(a,b,{fromSide:from,toSide:to,kind:'straight',line:{fill:dark?'#8BA9C3':C.muted,width:1.8},tail:{type:'triangle',width:'sm',length:'sm'}});}
function table(s,values,x,y,w,h,widths,size=18,dark=false){
 const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width:w,height:h,columnWidths:widths,values});
 t.borders.assign({style:'solid',fill:dark?'#385269':'#D6DDDF',width:.7});
 for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){
   const cell=t.getCell(r,c);cell.fill=r===0?(dark?'#24455F':'#DCE7EB'):(dark?C.navy:C.ivory);
   cell.text.style={typeface:FONT,fontSize:size,color:dark?C.white:C.ink,bold:r===0,alignment:c===values[0].length-1&&values[0].length===2?'right':'left',verticalAlignment:'middle',insets:{left:9,right:9,top:4,bottom:4}};
 }
 return t;
}
const physical=`flowchart LR
  A["Passive chemical sensing"] --> B["Validity screening"]
  B --> C["Phone image and reference"]
  C --> D["Colour result and local record"]
`;
const architecture=`flowchart LR
 A["Camera / 3 frames"] --> Q{"Quality OK?"}
 Q -- No --> T["Retry"]
 Q -- Yes --> P["OpenCV / reference normalisation / Lab + DE00"]
 P --> V{"Dot valid?"}
 V -- No --> X["Replace band"]
 V -- Yes --> R["Category + SQLite history"]
`;
await fs.writeFile(BUILD+'/product-flow.mmd',physical);
await fs.writeFile(BUILD+'/reader-architecture.mmd',architecture);
const projectNotes=`Project evidence: ${repo}. README.md, docs/ARCHITECTURE.md, docs/SCANNER_AND_CALIBRATION.md and docs/OPERATIONS_AND_SAFETY.md, inspected 26 October 2026. Expo SDK 57 documentation read at https://docs.expo.dev/versions/v57.0.0/. Current scanner uses deterministic known-layout sampling, RGB/Lab/CIEDE2000 and provisional thresholds. The original deck's calibrated ML estimator and perspective correction are future design objectives, not implemented or validated capabilities. FeSO4 expiry and quantitative exposure estimates remain provisional. No claim of clinical, field, or regulatory validation is made.`;
const eventNotes=`Event alignment source: ${brochure}. KHOJ Innovation Fair, 3 November 2026. Brochure p4 domains: AI in Healthcare, Innovation in Healthcare, IoT in Healthcare. This project is positioned in Innovation in Healthcare through occupational health, without recasting the passive band as an IoT radio or claiming a trained AI model. P5 criteria: innovation/originality, scientific concept, healthcare relevance, feasibility, presentation, social impact. P8: no college or participant names. Team name Tenet follows the user's explicit request. P9 Times New Roman and 48 x 36 portrait dimensions apply to the poster, not this requested PPT. P10 prohibits hazardous demo materials and requires a safe stable display. P11 asks for a functional demo, clear users/problem/objective/technology/working/benefits, limitations, disclosure of AI/APIs/datasets, and practical scalability.`;
// 1. Event cover with the actual healthcare proposition.
{
 const s=slide(true);await img(s,'hero.png',0,0,1280,720);
 txt(s,'TEAM TENET',58,53,450,35,22,C.amber,true);
 txt(s,'KHOJ 2026  /  INNOVATION IN HEALTHCARE',59,106,710,31,17,C.light,true);
 txt(s,'VajraSetu',55,217,720,114,86,C.white,true);
 txt(s,'Passive H₂S exposure recording\nfor occupational health',60,349,650,104,32,C.white);
 txt(s,'A disposable chemical patch, a phone scan\nand a worker’s exposure history',60,503,600,85,24,'#D6E3EE');
 txt(s,'For industrial workers and EHS teams',60,617,650,35,21,C.amber);
 footer(s,1,true,'Prototype concept. AI-generated visual. Supplemental record, not a live gas alarm or compliance instrument.');
 s.speakerNotes.text=`The healthcare problem is occupational exposure, with individual workers as users and industrial/EHS teams as prospective buyers. Original concept title: Passive Colorimetric H2S Exposure-Dosimeter Wristband with AI-Based Quantitative Reading. The original SIH IDs and previous team name are omitted because this is the KHOJ deck for Team Tenet.\n${eventNotes}\n${projectNotes}\nOriginal content source: ${original}, slides 2-5. Image: custom OpenAI ImageGen concept image, 26 October 2026. This does not depict a field trial or a manufactured/validated device. No participant names, college names or institutional logos appear in the slides.`;
}
// 2. Scientific concept and all six original product steps.
{
 const s=slide();
 txt(s,'Scientific concept and worker workflow',54,43,1172,59,42,C.ink,true);
 txt(s,'Healthcare need: H₂S exposure can harm the eyes, respiratory system and nervous system. [5,6]',56,112,1160,51,21,C.muted);
 await img(s,'product.png',39,182,510,382,'contain');
 const x=584;
 txt(s,'01  Passive chemical sensor',x,183,630,37,25,C.blue,true);
 txt(s,'CuSO₄ + glycerol + water beneath a Tyvek cover.\nConcept response: pale blue, then brown, then black.',x,228,620,61,21);
 txt(s,'02  Built-in validity indicator',x,312,630,37,25,C.blue,true);
 txt(s,'A FeSO₄ dot screens band usability against a calibrated\nreference. Reject an invalid band before interpretation.',x,357,620,62,21);
 txt(s,'03  End-of-shift phone capture',x,442,630,37,25,C.blue,true);
 txt(s,'Capture the complete card with a neutral reference.\nNormalise lighting before reading the sensing patch.',x,487,620,62,21);
 const b1=node(s,'04  Two-stage read\nValidity, then colour',54,574,250,68);
 const b2=node(s,'05  Cumulative dose\nCalibration-dependent',361,574,250,68);
 const b3=node(s,'06  Digital history\nWorker + shift record',668,574,250,68);
 const b4=node(s,'Offline guidance\nFive UI languages',975,574,250,68,{accent:true});
 edge(s,b1,b2);edge(s,b2,b3);edge(s,b3,b4);
 footer(s,2,false,'Paper sensor research: [2-4]. Exact formulation, expiry and dose accuracy need validation. Product illustration is conceptual.');
 s.speakerNotes.text=`Original deck content retained: disposable chemical sensor, accumulated exposure, built-in expiry indicator, end-of-shift capture, two-stage analysis, cumulative exposure estimate in ppm*h and digital exposure history. Original chemistry and material specification is a project proposal, not demonstrated by the cited papers for this exact formulation. [2] Sarfraz et al. (2019), DOI 10.3390/chemosensors7020023, studies RGB analysis of paper H2S colour strips. [3] DOI 10.1016/j.snb.2017.06.114 studies a Cu-PAN probe, which differs from this formulation. [4] DOI 10.3390/chemosensors9020040 studies an arene-derived dye sensor, also different. [5] DOI 10.3390/ijerph18062866 reviews the evidence behind exposure limits. [6] OSHA: https://www.osha.gov/chemicaldata/652 and https://www.osha.gov/hydrogen-sulfide/ for hazard context. These support the broader scientific/hazard basis, not this device's accuracy.\n${projectNotes}\nOriginal source: ${original}, slides 2 and 3. AI-generated product illustration from OpenAI ImageGen, 26 October 2026.\nMermaid source for product sequence:\n${physical}`;
}
// 3. Native editable reader architecture and the complete supplied dose series.
{
 const s=slide(true);
 txt(s,'On-device reader and evidence',54,43,1172,60,44,C.white,true);
 txt(s,'React Native / Expo SDK 57 / OpenCV / SQLite',56,115,1160,36,22,C.light);
 const a=node(s,'Camera\n3 frames',54,191,173,79,{dark:true});
 const q=node(s,'Quality\nOK?',273,174,155,111,{dark:true,diamond:true,size:18});
 const cv=node(s,'OpenCV\nReference + Lab / ΔE00',474,191,250,79,{dark:true,size:20});
 const v=node(s,'Dot\nvalid?',770,174,155,111,{dark:true,diamond:true,size:18});
 const r=node(s,'Colour category\n+ SQLite history',971,191,255,79,{dark:true,accent:true});
 edge(s,a,q,'right','left',true);edge(s,q,cv,'right','left',true);edge(s,cv,v,'right','left',true);edge(s,v,r,'right','left',true);
 const retry=node(s,'Retry',273,320,155,47,{dark:true,size:18});const replace=node(s,'Replace band',770,320,155,47,{dark:true,size:18});
 edge(s,q,retry,'bottom','top',true);edge(s,v,replace,'bottom','top',true);
 txt(s,'No',357,288,55,26,15,C.light);txt(s,'No',854,288,55,26,15,C.light);
 txt(s,'Yes',435,214,40,25,14,C.light);txt(s,'Yes',929,214,40,25,14,C.light);
 rule(s,54,398,1172,'#385269');
 txt(s,'Supplied calibration series',54,423,650,35,25,C.white,true);
 txt(s,'30 ppm × duration gives dose in ppm·h',55,465,650,29,18,C.light);
 const chart=s.charts.add('bar',{position:{left:44,top:508,width:632,height:141},categories:['0 min','5 min','10 min','15 min','30 min'],series:[{name:'Calculated dose (ppm·h)',values:[0,2.5,5,7.5,15],fill:'#6CA3FF'}],barOptions:{direction:'column',grouping:'clustered',gapWidth:95},hasLegend:false,chartFill:'none',plotAreaFill:'none',xAxis:{textStyle:{fontSize:14,fill:C.light},line:{fill:'#476377',width:1}},yAxis:{visible:false,min:0,max:19,majorGridlines:null},dataLabels:{showValue:true,position:'outEnd',textStyle:{fontSize:16,fill:C.white,bold:true}}});applyPresentationChartFont(chart,{fontFamily:FONT});
 txt(s,'What the record contains',728,423,500,36,25,C.amber,true);
 txt(s,'Worker ID, date, shift duration, band ID, validity\nand provisional exposure estimate.',729,470,496,60,20,C.white);
 txt(s,'Current: deterministic colour rules, local history,\nEnglish, Hindi, Bhojpuri, Marathi and Kannada.',729,543,496,59,19,C.light);
 txt(s,'Planned: perspective correction and a validated\nML estimator. Sarvam supports translation fallback.',729,607,496,58,18,C.light);
 footer(s,3,true,'Range: 0-15 ppm·h, one series, no replicates. Intermediate colours overlap. Dose/TWA and expiry remain provisional.');
 s.speakerNotes.text=`${projectNotes}\nOriginal approach retained: OpenCV preprocessing, region detection, reference normalisation, lighting compensation, RGB/CIELAB/DeltaE colour features, quantitative calibration and a local worker record. Spatial colour features, robust perspective correction and calibrated ML are planned original-design goals, not current validated capabilities. Current processing uses bounded central-card extraction, reference white balance, CIEDE2000 and three-frame consistency checks. Scan quality is an imaging metric, not chemical confidence.\nThe complete supplied 30 ppm test series: 0,5,10,15,30 minutes; calculated cumulative doses 0,2.5,5,7.5,15 ppm*h. Dose = concentration * duration. This chart is arithmetic, not an accuracy curve. Calibration v2 includes a pooled intermediate response because the supplied 5/15 minute colours overlap. Saturated dose is a lower bound. Fixed eight-hour TWA = cumulative dose / 8 hours, not actual recorded shift duration. The record schema includes worker/band metadata, dates, fixed reference shift, validity and provisional estimates.\nDisclosures requested by KHOJ p11: app uses React Native/Expo, native OpenCV and Expo SQLite; bundled local language copy with optional Sarvam translation/cache for non-core strings in supported languages. There is no trained image ML model or cloud image upload in the current scan path. Code and detailed architecture: ${repo}. [1] is background on interpreting direct instrument exposure records, not validation of a passive band.\nMermaid architecture source:\n${architecture}`;
}
// 4. Preserve every original pricing item as editable tables.
{
 const s=slide();
 txt(s,'Economics and industrial adoption',54,43,1172,58,43,C.ink,true);
 txt(s,'B2B buyers: industrial sites and EHS teams. Commercial components support local bulk procurement.',56,113,1170,50,20,C.muted);
 const starter=[['Starter band','Cost'],['Body + fastener','₹8'],['Reference + expiry','₹4'],['Assembly','₹3'],['Packaging + QC','₹3'],['Distribution','₹2'],['TOTAL','₹20']];
 const strip=[['Shift strip','Cost'],['Tyvek substrate','₹0.25'],['CuSO₄ chemistry','₹0.25'],['Reference + print','₹0.15'],['Cutting + QC','₹0.35'],['TOTAL','₹1.00']];
 table(s,starter,54,181,351,255,[256,95],19);
 table(s,strip,430,181,351,255,[256,95],19);
 txt(s,'100 workers',828,176,398,42,28,C.blue,true);
 txt(s,'₹2,000 setup',828,236,398,54,37,C.ink,true);
 txt(s,'+ ₹2,600/month',828,302,398,54,34,C.ink,true);
 txt(s,'100 × ₹20 starter bands\n100 × 26 shifts × ₹1 strips',830,371,396,65,20,C.muted);
 txt(s,'Reusable format',54,451,254,34,22,C.blue,true);
 txt(s,'Durable body for demanding sites. Replace only the sensing strip each shift to reduce band waste.',281,451,945,51,19);
 txt(s,'Disposable format',54,505,254,34,22,C.blue,true);
 txt(s,'Single-use band targeting ₹1 per band for routine shifts and cost-sensitive teams.',281,505,945,40,19);
 table(s,[['Option','Role','Operating trade-off'],['Electronic detector','Real-time ppm and alarms','Battery and calibration'],['Passive badge / tube','Cumulative visual readout','Manual logging'],['VajraSetu','Colour readout + phone record','Low-cost target; validation required']],54,548,1172,85,[268,472,432],14.5);
 footer(s,4,false,'Original deck cost targets, not vendor quotes. Confirm through procurement, calibration and field trials. Assumes 26 shifts/month.');
 s.speakerNotes.text=`Original source: ${original}, slide 4, Working cost model. Every original allocation retained: Starter band INR20 = body/fastener8 + reference/expiry4 + assembly3 + packaging/QC3 + distribution2. Shift strip INR1.00 = Tyvek substrate0.25 + CuSO4 chemistry0.25 + reference/print0.15 + cutting/QC0.35. 100 workers: INR2000 initial setup plus INR2600/month. Monthly arithmetic is 100 workers * 26 shifts/month * INR1 per replacement strip; 26 is the assumption implicit in the original total. These are design allocation targets, not verified quotations, sales prices, margins or a complete operating budget. Phones, validation, training, taxes and support are not included in the original model.\nThe original separately proposes a disposable INR1/band variant, while the detailed INR1 allocation is for the replacement shift strip. The slide preserves that distinction rather than claiming the whole disposable product has a validated bill of materials. Original band-format intent: reusable for demanding conditions and sustainability, disposable for cost-sensitive routine shifts. Local manufacturing and commercially available components are opportunities subject to supplier confirmation.\nOriginal positioning retained: electronic detector = live ppm/alarms, battery/calibration; passive badge/tube = cumulative visual/manual record; VajraSetu = colour-to-phone record and low-cost target. The passive band cannot replace certified gas detection.\n${eventNotes}`;
}
// 5. Healthcare impact, deployment, challenges and a safe functional demo.
{
 const s=slide();
 txt(s,'Healthcare impact and route to deployment',54,43,1172,58,41,C.ink,true);
 const benefits=[['Worker health','Visible band checks support\nexposure awareness and\nsupervisor review.'],['Industrial usability','Passive, lightweight band.\nOffline records in factories\nand oil-and-gas settings.'],['Digital records','Worker and shift history with\ndate, band validity and\nprovisional exposure.'],['Make in India','Local manufacturing potential\nand affordable consumables\nfor broader access.']];
 for(let i=0;i<4;i++){const x=54+i*299;txt(s,benefits[i][0],x,148,275,37,24,C.blue,true);txt(s,benefits[i][1],x,195,275,96,20,C.muted);}
 rule(s,54,316,1172);
 txt(s,'Deployment',54,342,220,33,22,C.ink,true);
 txt(s,'01  Prototype',288,342,250,34,23,C.ink,true);
 txt(s,'02  Controlled validation',559,342,355,34,23,C.ink,true);
 txt(s,'03  Phased rollout',964,342,265,34,23,C.ink,true);
 const challenges=[['Challenge','Site reality','Response'],['Connectivity','Industrial dead zones','Local SQLite logging and offline caching'],['Privacy','Exposure and shift histories','Planned on-device encryption and role-based access'],['Integration','Legacy safety workflows','Plant partners and standard template exports'],['Adoption','A new chemical-patch workflow','Guided onboarding and visual colour cues'],['Durability / cost','Wear and price sensitivity','Reusable body for harsh use; disposable cost option']];
 table(s,challenges,54,398,1172,200,[196,365,611],17.2);
 txt(s,'KHOJ demonstration',54,620,275,33,21,C.blue,true);
 txt(s,'Scan prepared colour samples, show an invalid-band/retry path, then open local history. No live H₂S.',332,619,894,51,19,C.ink);
 footer(s,5,false,'Impact is proposed, not measured. Pilot gates: calibration and stability, held-out devices/batches, language review and EHS approval.');
 s.speakerNotes.text=`Original source: ${original}, slides 4 and 5. All original impact themes retained: worker safety/awareness, industrial usability, digital safety records and Make in India. The goal is to support interpretation of a cumulative passive signal alongside direct instruments, not to claim reduced illness, validated personal dosimetry or emergency protection. Proposed pilot beneficiaries include industrial workers and supervisors; healthcare relevance is prevention-oriented occupational health and traceable workplace review.\nAll original challenge/response rows retained. Privacy response (on-device encryption and role-based access) and standard template exports are design goals, not implemented security or integration claims. Offline SQLite logging and bundled language copy exist. Reusable/disposable band alternatives address durability and cost. The implementation has one local worker profile, not multi-role remote access.\nOriginal rollout stages retained: prototype, controlled field validation, phased deployment. Before a field trial, calibrate the final formulation and exact batch, test stability/aged expiry controls and interference, hold out devices/operators/batches, measure false-valid/category/retry rates, validate native language wording, complete EHS review and agree pilot success criteria.\n${eventNotes}\nKHOJ demo plan: bring the working native app on a charged phone, prepared non-reactive colour reference samples or photographs, and a safe band enclosure/display. Demonstrate capture, repeatability rejection, invalid-band path and saved history. Do not bring or generate H2S, and do not use hazardous chemicals for the live public demonstration. The brochure supplies one table and two chairs, requests advance declaration of additional facilities, forbids thermocol and asks for environmentally friendly, safe, stable models.\n${projectNotes}`;
}
// 6. Dedicated reference page with the same six sources as the original PPT.
{
 const s=slide(true);txt(s,'Research and references',54,43,1172,62,45,C.white,true);
 const sources=[
 ['[1] Austigard, Å. & Smedbold, H.T. (2022).','Hydrogen Sulphide (H₂S) Exposure Hazard Assessment: An Algorithm for Generating Exposure Index Based on Direct Instrument Readings.','Annals of Work Exposures and Health, 66(1), 124–129.','10.1093/annweh/wxab047'],
 ['[2] Sarfraz, J. et al. (2019).','Electro-Optical Gas Sensor Consisting of Nanostructured Paper Coating and an Ultrathin Sensing Element.','Chemosensors, 7(2), 23.','10.3390/chemosensors7020023'],
 ['[3] Quantitative, Colorimetric Paper Probe (2017).','Quantitative, Colorimetric Paper Probe for Hydrogen Sulfide Gas.','Sensors and Actuators B: Chemical, 253, 846–851.','10.1016/j.snb.2017.06.114'],
 ['[4] Vargas, A.P. et al. (2021).','A Paper-Based Ultrasensitive Optical Sensor for the Selective Detection of H₂S Vapors.','Chemosensors, 9(2), 40.','10.3390/chemosensors9020040'],
 ['[5] Elwood, M. (2021).','The Scientific Basis for Occupational Exposure Limits for Hydrogen Sulphide—A Critical Commentary.','International Journal of Environmental Research and Public Health, 18(6), 2866.','10.3390/ijerph18062866'],
 ['[6] OSHA.','Hydrogen Sulfide — Chemical Data & Exposure Limits.','Occupational Chemical Database.','https://www.osha.gov/chemicaldata/652']
 ];
 const positions=[[54,135],[54,307],[54,479],[665,135],[665,307],[665,479]];
 for(let i=0;i<sources.length;i++){
  const [x,y]=positions[i],a=sources[i];
  txt(s,a[0],x,y,550,30,19.5,C.white,true);
  txt(s,a[1],x,y+35,550,72,17.8,C.light);
  txt(s,a[2],x,y+109,550,35,14.3,C.light);
  const label=a[3].startsWith('http')?'osha.gov/chemicaldata/652':'DOI: '+a[3];
  const link=txt(s,label,x,y+143,550,25,14.5,C.amber);
  link.text.get(label).link={uri:a[3].startsWith('http')?a[3]:'https://doi.org/'+a[3],isExternal:true};
 }
 rule(s,54,655,1172,'#385269');
 const gh=txt(s,'Project repository',54,674,270,26,16,C.white,true);gh.text.get('Project repository').link={uri:repo,isExternal:true};
 const vid=txt(s,'Demonstration video',423,674,300,26,16,C.white,true);vid.text.get('Demonstration video').link={uri:'https://youtu.be/GOxGEgo1RlY?si=NJ1JC1ct8GN9xCya',isExternal:true};
 txt(s,'Team Tenet',1002,674,223,25,15,C.light,false,'right');
 s.speakerNotes.text=`Same six literature/regulatory sources as the original PPT, with the original GitHub and YouTube links retained. Minor author-initial corrections follow publisher metadata (Vargas A.P., Elwood M.); no source was replaced. Sources accessed 26 October 2026. The papers demonstrate related approaches, not validation of VajraSetu's exact CuSO4/FeSO4 formulation.\n`+sources.map(a=>a.join(' ')).join('\n')+`\nGitHub: ${repo}\nYouTube: https://youtu.be/GOxGEgo1RlY?si=NJ1JC1ct8GN9xCya\nOriginal source deck: ${original}\n${projectNotes}\nEvent adaptation source (not added to the original numbered literature list): ${brochure}. Brochure pp4,5,8,10,11 informed the healthcare-domain framing, evaluation coverage and functional safe-demo plan.\nAI/API/resource disclosure: cover and product illustration generated using OpenAI ImageGen. Mermaid sources are in notes for the two diagrams. App is React Native/Expo 57 with OpenCV/SQLite, optional Sarvam translation fallback and the supplied single 30 ppm calibration series. No trained visual ML model is present. Team attribution follows the user's request, while personal/college identifiers are omitted.`;
}
await fs.mkdir(BUILD+'/renders',{recursive:true});
for(const [i,s] of p.slides.items.entries()){const b=await p.export({slide:s,format:'png',scale:1.5});await fs.writeFile(BUILD+`/renders/slide-${i+1}.png`,new Uint8Array(await b.arrayBuffer()));}
const candidatePath=BUILD+'/candidate.pptx';await(await PresentationFile.exportPptx(p)).save(candidatePath);
const finalPath=ROOT+'/output/tenet/Tenet-VajraSetu-Khoj-v2.pptx';
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath,finalPath,pythonExecutable:'/Users/arnavdeshpande/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',integrityValidatorPath:SKILL+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:SKILL+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','4','--require-native-table-slide','5'],explicitTotalSlideCount:6,requiredNativeChartOwnerSlides:[3],requiredNativeTableOwnerSlides:[4,5],materializeLiteralChartWorkbooks:true,fontPolicy:{basis:'design',families:[FONT]},verifyArtifactToolImport:true,receiptPath:BUILD+'/validation.json'});
console.log(JSON.stringify({finalPath:result.finalPath,slides:6,passed:result.packageIntegrity.status,layoutFindings:result.presentationLayout.findingCount}));
const checked=await PresentationFile.importPptx(await FileBlob.load(finalPath));await fs.mkdir(BUILD+'/final-renders',{recursive:true});for(const [i,s]of checked.slides.items.entries()){const b=await checked.export({slide:s,format:'png',scale:1});await fs.writeFile(BUILD+`/final-renders/slide-${i+1}.png`,new Uint8Array(await b.arrayBuffer()));}
