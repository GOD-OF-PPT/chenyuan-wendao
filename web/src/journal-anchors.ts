/** Local reading tokens, never persisted or used as action identity. */
export type JournalLedger={run:string;revision:number;texts:string[];keys:string[];next:number};
export type JournalWrite={run:string;revision:number;added:number};
export function journalAnchors(old:JournalLedger|undefined,texts:readonly string[],run:string,revision:number,writes:readonly JournalWrite[]=[]):JournalLedger{
 let overlap=0,next=old?.next??0;
 if(old?.run===run&&revision>=old.revision){
  const updates=writes.filter(w=>w.run===run&&w.revision>old.revision&&w.revision<=revision).sort((a,b)=>a.revision-b.revision);
  const known=updates.length===revision-old.revision&&updates.every((w,i)=>w.revision===old.revision+i+1&&[0,1,2].includes(w.added));
  if(known){const added=updates.reduce((n,w)=>n+w.added,0),retained=Math.max(0,texts.length-added);
   if(texts.length===Math.min(100,old.texts.length+added)&&old.texts.slice(old.texts.length-retained).every((text,i)=>text===texts[i]))overlap=retained;
  }
 }
 const keys=overlap?old!.keys.slice(-overlap):[];
 for(let i=overlap;i<texts.length;i++)keys.push('journal-read-'+next++);
 return{run,revision,texts:[...texts],keys,next};
}
