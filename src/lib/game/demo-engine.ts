import {evaluate,type Card} from './cards.ts';
export type Receipt={id:string;kind:string;amount:number;status:'pending'|'confirmed'|'rejected';time:string};
export type Circuit={round:number;scores:number[];log:string[];finished:boolean;claimed:boolean};
export function resolveReceipt(escrow:number,receipts:Receipt[],id:string,accepted:boolean){
 const r=receipts.find(x=>x.id===id);
 if(!r||r.status!=='pending')return {escrow,receipts,credit:0};
 const credit=(r.kind==='withdraw'&&accepted||r.kind==='deposit'&&!accepted)?r.amount:0;
 return {escrow:escrow+(r.kind==='deposit'&&accepted||r.kind==='withdraw'&&!accepted?r.amount:0),credit,receipts:receipts.map(x=>x.id===id?{...x,status:accepted?'confirmed' as const:'rejected' as const}:x)};
}
export function collectCircuit(c:Circuit|null){if(!c?.finished||c.claimed)return {circuit:c,credit:0,rank:-1};const rank=c.scores.filter(x=>x>c.scores[0]).length;return {circuit:{...c,claimed:true},credit:[500,250,100,0][rank],rank}}
export function showdownPoints(d:Card[]){if(d.length!==52||new Set(d.map(c=>c.rank+c.suit)).size!==52)throw Error('A unique 52-card deck is required');const board=d.slice(8,13);const scores=[0,1,2,3].map(i=>evaluate([...d.slice(i*2,i*2+2),...board]));return {board,scores,points:scores.map(x=>[10,6,3,1][scores.filter(y=>y.score>x.score).length])}}
export function dailyCredit(previous:string,today:string){return previous===today?0:500}
