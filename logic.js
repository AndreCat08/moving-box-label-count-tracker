export const ROOMS=["Kitchen","Bedroom","Bathroom","Living Room","Other"];
export const MAX_LABEL_LENGTH=120;
export function normalizeLabel(l){return String(l??"").replace(/\s+/g," ").trim()}
export function isKnownRoom(r){return ROOMS.includes(r)}
export function makeId(){return globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():"b-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8)}
export function nextBoxNumber(b){return b.reduce((m,x)=>Math.max(m,Number(x?.boxNumber)||0),0)+1}
export function addBox(boxes,rawLabel,rawRoom){
  const label=normalizeLabel(rawLabel),room=String(rawRoom??"");
  if(!label)return{ok:false,state:boxes,error:"Enter a label for the box.",box:null};
  if(label.length>MAX_LABEL_LENGTH)return{ok:false,state:boxes,error:`Label must be ${MAX_LABEL_LENGTH} characters or fewer.`,box:null};
  if(!isKnownRoom(room))return{ok:false,state:boxes,error:"Choose a valid room.",box:null};
  const box=Object.freeze({id:makeId(),label,room,boxNumber:nextBoxNumber(boxes)});
  return{ok:true,state:Object.freeze([box,...boxes]),error:null,box};
}
export function deleteBox(boxes,id){return Object.freeze(boxes.filter(b=>b.id!==id))}
export function summarize(boxes){
  const c=Object.fromEntries(ROOMS.map(r=>[r,0]));
  for(const b of boxes)if(c[b.room]!=null)c[b.room]+=1;
  return c;
}