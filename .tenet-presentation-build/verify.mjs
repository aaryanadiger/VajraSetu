import fs from 'node:fs/promises';
import {FileBlob, PresentationFile} from '@oai/artifact-tool';
const root='/Users/arnavdeshpande/Engineering DB/SIH26/VajraSetu';
const p=await PresentationFile.importPptx(await FileBlob.load(root+'/output/tenet/Tenet-VajraSetu.pptx'));
await fs.mkdir(root+'/.tenet-presentation-build/final-renders',{recursive:true});
for(const [i,slide] of p.slides.items.entries()){
 const blob=await p.export({slide,format:'png',scale:1});
 await fs.writeFile(root+`/.tenet-presentation-build/final-renders/slide-${i+1}.png`,new Uint8Array(await blob.arrayBuffer()));
}
console.log(`Verified final file renders: ${p.slides.items.length} slides`);
