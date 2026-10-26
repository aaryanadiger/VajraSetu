import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
import { finalizePresentation, applyPresentationChartFont } from '/Users/arnavdeshpande/.codex/plugins/cache/openai-primary-runtime/presentations/26.1024.11018/skills/presentations/container_tools/artifact_tool_utils.mjs';

const ROOT = '/Users/arnavdeshpande/Engineering DB/SIH26/VajraSetu';
const BUILD = path.join(ROOT, '.tenet-presentation-build');
const OUT = path.join(ROOT, 'output/tenet');
const SKILL = '/Users/arnavdeshpande/.codex/plugins/cache/openai-primary-runtime/presentations/26.1024.11018/skills/presentations';
const FONT = 'Avenir Next';
const C = {navy:'#0A2038', ivory:'#F5F2EA', ink:'#142B43', blue:'#2363DA', muted:'#526574', light:'#BDCEDD', amber:'#E8B563', line:'#D3D9D9', box:'#173750', white:'#FFFFFF'};
const p = Presentation.create({slideSize:{width:1280,height:720}});
const refs = {
  ilo:'https://www.ilo.org/resource/news/nearly-3-million-people-die-work-related-accidents-and-diseases',
  niosh:'https://www.cdc.gov/niosh/npg/npgd0337.html',
  repo:'https://github.com/aaryanadiger/VajraSetu/tree/57d48d1238d04b483a492bf38bbc212b745c98f2',
  expo:'https://docs.expo.dev/versions/v57.0.0/',
  canva:'https://www.canva.com/design/DAHVkQadZBA/8sKx2MfSjISZCmg6W30OqA/edit',
};
function txt(s,text,x,y,w,h,size=24,color=C.ink,bold=false,align='left') {
 const sh=s.shapes.add({geometry:'textbox',name:text.replace(/\n/g,' ').slice(0,70),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=text;
 sh.text.style={fontSize:size,typeface:FONT,color,bold,alignment:align,verticalAlignment:'top',autoFit:'none',wrap:'square',insets:0};
 return sh;
}
function rule(s,x,y,w,color=C.line){s.shapes.add({geometry:'line',position:{left:x,top:y,width:w,height:0},line:{fill:color,width:1}});}
function footer(s,n,dark=false,source='') {
 const col=dark?C.light:C.muted;
 if(source)txt(s,source,64,664,1080,28,14,col);
 txt(s,String(n).padStart(2,'0'),1165,665,50,25,15,col,false,'right');
}
function slide(dark=false){const s=p.slides.add();s.background.fill=dark?C.navy:C.ivory;return s;}
async function image(s,file,x,y,w,h,fit='cover'){const b=await fs.readFile(path.join(BUILD,'assets',file));return s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt:file==='hero.png'?'AI-generated concept of a worker wearing a passive sensing band':'AI-generated concept illustration of wristband and phone scanner',position:{left:x,top:y,width:w,height:h},fit});}
function node(s,label,x,y,w,h,dark=false,diamond=false,accent=false){
 const sh=s.shapes.add({geometry:diamond?'diamond':'roundRect',name:label,position:{left:x,top:y,width:w,height:h},fill:accent?C.blue:(dark?C.box:'#E7ECED'),line:{fill:dark?'#476377':'#A7B8C4',width:1.2},borderRadius:diamond?undefined:8});
 if(diamond){
   txt(s,label,x+8,y+29,w-16,h-58,20,dark?C.white:C.ink,true,'center');
 } else {
   sh.text=label;sh.text.style={typeface:FONT,fontSize:22,color:dark||accent?C.white:C.ink,bold:true,alignment:'center',verticalAlignment:'middle',insets:14,autoFit:'none'};
 }
 return sh;
}
function edge(s,a,b,from='right',to='left',dark=false,kind='straight'){
 return s.shapes.connect(a,b,{fromSide:from,toSide:to,kind,line:{fill:dark?'#8BA9C3':C.muted,width:2},tail:{type:'triangle',width:'sm',length:'sm'}});
}
const architecture=`flowchart LR
  B["Passive indicator card"] --> C["Expo Camera / 3 frames"]
  C --> P["OpenCV / CIELAB + DE00"]
  P --> R["Validity + colour rules"]
  R --> U["Result + safety text"]
  U --> D[("SQLite / local history")]
`;
const decisions=`flowchart LR
  A["Three-frame capture"] --> Q{"Image quality passes?"}
  Q -- Yes --> V{"Validity dot passes?"}
  Q -- No --> T["Retry capture"]
  V -- Yes --> R["Colour category + record"]
  V -- No --> X["Replace band"]
`;
await fs.writeFile(path.join(BUILD,'architecture.mmd'),architecture);
await fs.writeFile(path.join(BUILD,'scan-decisions.mmd'),decisions);

// 1. Cover.
{
 const s=slide(true);await image(s,'hero.png',0,0,1280,720);
 txt(s,'TEAM TENET',66,66,500,36,22,C.amber,true);
 txt(s,'VajraSetu',64,218,700,115,88,C.white,true);
 txt(s,'A worker’s wristband check,\nrecorded on a phone',69,352,570,110,33,C.white);
 txt(s,'Passive H₂S sensing concept\nDevice-local mobile prototype',70,522,480,76,22,'#D7E2EA');
 txt(s,'Product concept illustration',70,667,500,23,13,'#BBCCD8');
 s.speakerNotes.text=`Team Tenet. VajraSetu is a prototype system for recording the colour state of a passive H2S sensing band. This is not a real-time gas detector and does not establish air safety or legal compliance. Current status source [3]: README.md, docs/ARCHITECTURE.md and docs/SCANNER_AND_CALIBRATION.md in local repository snapshot 57d48d1238d04b483a492bf38bbc212b745c98f2, inspected 26 October 2026. ${refs.repo}\nVisual: custom AI-generated concept image using OpenAI ImageGen, 26 October 2026. The scene and product are illustrative, not a field trial photograph.\nInspiration: ${refs.canva}. Read only. Original design was not modified.`;
}
// 2. Context and motivation.
{
 const s=slide();
 txt(s,'The H₂S monitoring gap',64,58,1100,70,48,C.ink,true);
 txt(s,'Smell cannot reliably warn a worker\nthat hydrogen sulfide is still present. [2]',64,157,710,100,31,C.muted);
 txt(s,'100 ppm',64,310,565,110,84,C.blue,true);
 txt(s,'Immediately dangerous to life\nor health, according to NIOSH. [2]',68,427,510,85,25);
 txt(s,'10 ppm',677,312,540,105,76,C.ink,true);
 txt(s,'NIOSH recommended ceiling\nfor a 10-minute exposure. [2]',682,427,520,85,25);
 rule(s,64,552,1152);
 txt(s,'The role for VajraSetu',64,579,365,39,24,C.blue,true);
 txt(s,'A repeatable wristband check and a local record\nalongside site-approved gas monitoring.',450,575,758,72,25);
 footer(s,2,false,'[2] CDC / NIOSH Pocket Guide, Hydrogen sulfide. U.S. hazard references, not Indian compliance limits.');
 s.speakerNotes.text=`[2] CDC/NIOSH Pocket Guide to Chemical Hazards: Hydrogen sulfide. ${refs.niosh} Accessed 26 October 2026. IDLH is 100 ppm. NIOSH REL is a 10 ppm ceiling for a 10-minute period, not an 8-hour TWA. NIOSH states that the sense of smell rapidly fatigues and cannot be relied on to warn of continuous H2S presence. These U.S. references are context, not claims about applicable Indian legal limits.\n[3] Product role: ${refs.repo}, README.md and docs/OPERATIONS_AND_SAFETY.md. A low band reading does not prove safe air. Certified/direct-reading monitors and site procedures remain essential. The prototype cannot identify instantaneous peaks.`;
}
// 3. Product mechanism.
{
 const s=slide();
 txt(s,'The band and the worker experience',64,58,1160,66,46,C.ink,true);
 await image(s,'product.png',597,159,657,493,'contain');
 const ys=[180,320,460];
 const headings=['A sensing patch','A validity dot','A guided scan'];
 const bodies=['CuSO₄ colour change is the\nsignal the camera reads.', 'FeSO₄ provides a provisional\ncheck before interpretation.', 'Three consistent frames produce\na category and local history.'];
 for(let i=0;i<3;i++){txt(s,`0${i+1}`,64,ys[i],65,45,27,C.blue,true);txt(s,headings[i],151,ys[i]-1,430,45,29,C.ink,true);txt(s,bodies[i],151,ys[i]+50,433,82,23,C.muted);}
 footer(s,3,false,'[3] Current prototype: 5 UI languages, bundled core safety copy, device-local SQLite history. Concept illustration.');
 s.speakerNotes.text=`[3] ${refs.repo}. Sources: docs/SCANNER_AND_CALIBRATION.md (expected CuSO4 sensing patch, FeSO4 validity dot, neutral reference), docs/ARCHITECTURE.md (three final capture frames, local SQLite data and language behaviour), README.md (implemented status). The physical sensor and expiry chemistry require batch-specific calibration and independent validation. Current implementation uses known-layout sampling and deterministic rules, not a trained ML model. Colour categories are provisional. Core copy is bundled in English, Bhojpuri, Hindi, Marathi and Kannada. Non-core strings in supported languages may use Sarvam fallback and cache.\nVisual: custom AI-generated product concept illustration, OpenAI ImageGen, 26 October 2026. It is not a photo or production specification.`;
}
// 4. Native editable architecture, with Mermaid source preserved in notes.
{
 const s=slide(true);
 txt(s,'Device-local architecture',64,57,1152,70,48,C.white,true);
 txt(s,'The scan stays on the phone',65,139,1000,43,27,C.light);
 const b=node(s,'Passive\nindicator card',64,235,232,106,true);
 const c=node(s,'Expo Camera\n3-frame capture',371,235,232,106,true);
 const cv=node(s,'On-device OpenCV\nCIELAB + ΔE00',678,235,232,106,true);
 const r=node(s,'Validity +\ncolour rules',985,235,232,106,true,false,true);
 edge(s,b,c,'right','left',true);edge(s,c,cv,'right','left',true);edge(s,cv,r,'right','left',true);
 const u=node(s,'Result +\nsafety text',985,447,232,106,true);
 const d=node(s,'SQLite\nLocal scan history',678,447,232,106,true);
 edge(s,r,u,'bottom','top',true);edge(s,u,d,'left','right',true);
 txt(s,'Works without a network',64,439,520,45,29,C.white,true);
 txt(s,'Core guidance is bundled in five languages.\nNo trained ML model is required for scanning.',64,496,553,87,24,C.light);
 txt(s,'Current mobile stack',64,606,295,33,19,C.amber,true);
 txt(s,'React Native / Expo SDK 57 / OpenCV / SQLite',360,606,850,35,22,C.white);
 footer(s,4,true,'[3] Repository architecture and implemented scan flow. [4] Expo SDK 57 reference.');
 s.speakerNotes.text=`[3] ${refs.repo}. docs/ARCHITECTURE.md, README.md and src/services/imageProcessing.ts. Scope shown: deterministic scan path and local result persistence. Captured RGB is normalised using the neutral reference and converted to Lab, then CIEDE2000 difference supports validity and colour decisions. The production build requires native OpenCV support. No image upload or remote identity system is part of this scan path. Optional translation fallback for unbundled strings is outside the diagram. CSV text generation exists, but a secure share/save workflow and remote synchronisation are not implemented.\n[4] ${refs.expo} Accessed 26 October 2026.\nEditable architecture diagram corresponding to this Mermaid source (line breaks expanded for presentation):\n${architecture}`;
}
// 5. Scan decisions and empirical boundary.
{
 const s=slide();
 txt(s,'Scan decisions and evidence limits',64,55,1152,64,46,C.ink,true);
 const a=node(s,'Three-frame\ncapture',64,164,200,80);
 const q=node(s,'Quality\nOK?',333,145,177,118,false,true);
 const v=node(s,'Dot\nvalid?',661,145,177,118,false,true);
 const r=node(s,'Colour category\n+ local record',972,164,244,80,false,false,true);
 const retry=node(s,'Retry capture',333,296,177,52);
 const replace=node(s,'New band',661,296,177,52);
 edge(s,a,q);edge(s,q,v);edge(s,v,r);edge(s,q,retry,'bottom','top');edge(s,v,replace,'bottom','top');
 txt(s,'Yes',558,180,60,30,17,C.muted,false,'center');txt(s,'Yes',878,180,60,30,17,C.muted,false,'center');
 txt(s,'No',430,267,40,26,16,C.muted);txt(s,'No',758,267,40,26,16,C.muted);
 rule(s,64,383,1152);
 txt(s,'Supplied test doses',64,409,615,36,25,C.ink,true);
 txt(s,'30 ppm × exposure duration, expressed as ppm·h [3]',64,448,640,28,17,C.muted);
 const ch=s.charts.add('bar',{position:{left:52,top:480,width:626,height:162},categories:['0 min','5 min','10 min','15 min','30 min'],series:[{name:'Cumulative dose (ppm·h)',values:[0,2.5,5,7.5,15],fill:C.blue}],barOptions:{direction:'column',grouping:'clustered',gapWidth:100},hasLegend:false,chartFill:'none',plotAreaFill:'none',xAxis:{textStyle:{fontSize:15,fill:C.muted},line:{fill:C.line,width:1}},yAxis:{visible:false,min:0,max:18,majorGridlines:null},dataLabels:{showValue:true,position:'outEnd',textStyle:{fontSize:17,fill:C.ink,bold:true}}});
 applyPresentationChartFont(ch,{fontFamily:FONT});
 txt(s,'0–15 ppm·h',754,405,462,66,46,C.blue,true);
 txt(s,'Current calibration range',757,476,460,33,24,C.ink,true);
 txt(s,'One series, without replicates.\nIntermediate colours overlap.\nInterference and expiry need validation.',757,525,460,101,21,C.muted);
 footer(s,5,false,'[3] Supplied 30 ppm series. Dose = concentration × time. Quantitative exposure and TWA remain provisional.');
 s.speakerNotes.text=`[3] ${refs.repo}, docs/SCANNER_AND_CALIBRATION.md and calibration/h2s_curve_v2.json. Five supplied controls at 30 ppm are 0, 5, 10, 15 and 30 minutes, corresponding to 0, 2.5, 5, 7.5 and 15 ppm*h. The chart is an arithmetic dose calculation, not a sensor accuracy curve. The photographed intermediate patches are not monotonic, and the 5/15-minute colours substantially overlap. The pipeline pools that region rather than claiming those doses can be distinguished. The maximum measured colour represents a lower bound at or above 15 ppm*h. There are no supplied replicates or cross-interference tests. The FeSO4 validity decision also remains provisional. Scan-quality checks describe imaging consistency, not chemical confidence. The eight-hour reference period is fixed, not a measured actual shift. Do not use app estimates to establish compliance or make emergency decisions.\nEditable decision diagram corresponding to this Mermaid source:\n${decisions}`;
}
// 6. Gated pilot and complete reference index.
{
 const s=slide(true);
 txt(s,'A gated path to a worker pilot',64,55,1152,66,46,C.white,true);
 txt(s,'Required before operational use',65,135,1100,34,24,C.amber);
 const stages=[['01','Lab evidence','Batch calibration, aged controls\nand interference testing.'],['02','Reader robustness','Independent phones, lighting\nand held-out card batches.'],['03','Worker usability','Language review, scan retries\nand result comprehension.'],['04','Controlled pilot','EHS approval and agreed\nsuccess criteria at one site.']];
 for(let i=0;i<4;i++){let x=64+i*295;txt(s,stages[i][0],x,207,260,41,25,C.amber,true);txt(s,stages[i][1],x,254,275,42,25,C.white,true);txt(s,stages[i][2],x,306,275,68,20,C.light);}
 rule(s,64,402,1152,'#385269');
 txt(s,'References',64,433,1152,42,29,C.white,true);
 const rs=[
  {x:64,y:491,title:'[1] ILO, global workplace burden (2023)',detail:'2.93 million deaths annually across all work-related causes.',url:refs.ilo},
  {x:674,y:491,title:'[2] CDC / NIOSH, Hydrogen sulfide',detail:'100 ppm IDLH and 10 ppm / 10-minute ceiling.',url:refs.niosh},
  {x:64,y:571,title:'[3] VajraSetu, project evidence',detail:'Architecture, scanner and calibration docs. Snapshot: 57d48d1.',url:refs.repo},
  {x:674,y:571,title:'[4] Expo SDK 57 documentation',detail:'Version-specific mobile platform reference.',url:refs.expo},
 ];
 for(const ref of rs){const sh=txt(s,ref.title,ref.x,ref.y,548,30,20,C.white,true);sh.text.get(ref.title).link={uri:ref.url,isExternal:true};txt(s,ref.detail,ref.x,ref.y+34,548,40,16,C.light);}
 footer(s,6,true,'Team Tenet. References link to sources. Full citations and Mermaid source are included in speaker notes.');
 s.speakerNotes.text=`Proposed validation and pilot pathway, not a completed trial or an operating commitment. Based on current blockers in docs/SCANNER_AND_CALIBRATION.md and docs/OPERATIONS_AND_SAFETY.md. Success criteria must be specified with the EHS/lab partner before collecting data. Measure false-valid results, unreadable scans, colour-category errors, retry rate and worker comprehension separately. No unsupported claims of field accuracy, safety improvement, unit price or regulatory approval are made.\nReferences, accessed 26 October 2026:\n[1] International Labour Organization. Nearly 3 million people die of work-related accidents and diseases. Published 26 November 2023. ${refs.ilo} This is global all-cause workplace context, not an H2S death estimate.\n[2] CDC/NIOSH. Pocket Guide to Chemical Hazards: Hydrogen sulfide. ${refs.niosh}\n[3] VajraSetu project repository, revision 57d48d1238d04b483a492bf38bbc212b745c98f2. ${refs.repo} Primary project sources: README.md, docs/ARCHITECTURE.md, docs/SCANNER_AND_CALIBRATION.md, docs/OPERATIONS_AND_SAFETY.md, package.json, calibration/h2s_curve_v2.json. Local snapshot inspected 26 October 2026.\n[4] Expo SDK 57 reference. ${refs.expo}\nVisual inspiration only: ${refs.canva}. Custom AI concept images on slides 1 and 3 generated using OpenAI ImageGen on 26 October 2026. All slide copy and diagrams are editable. Mermaid sources are preserved in notes on slides 4 and 5.`;
}
await fs.mkdir(path.join(BUILD,'renders'),{recursive:true});
for(const [i,s] of p.slides.items.entries()){
 const blob=await p.export({slide:s,format:'png',scale:1.5});
 await fs.writeFile(path.join(BUILD,'renders',`slide-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const draft=path.join(BUILD,'tenet-draft.pptx');
await (await PresentationFile.exportPptx(p)).save(draft);
const finalPath=path.join(OUT,'Tenet-VajraSetu.pptx');
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:draft,finalPath,pythonExecutable:'/Users/arnavdeshpande/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:6,requiredNativeChartOwnerSlides:[5],requiredNativeTableOwnerSlides:[],materializeLiteralChartWorkbooks:true,fontPolicy:{basis:'design',families:[FONT]},verifyArtifactToolImport:true,receiptPath:path.join(BUILD,'validation.json')});
console.log(JSON.stringify(result));
