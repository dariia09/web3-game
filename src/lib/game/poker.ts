import {deck,evaluate,type Card} from './cards.ts';
export type Action='fold'|'check'|'call'|'raise';
export type Difficulty='casual'|'standard'|'expert';
export type Seat={name:string;cards:Card[];stack:number;paid:number;bet:number;folded:boolean;action:string;payout:number};
export type Poker={seats:Seat[];board:Card[];shoe:Card[];street:number;actor:number;pending:number[];bet:number;raises:number;button:number;done:boolean;showdown:boolean;log:string[];winners:number[];result:string;initial:number};
const live=(g:Poker)=>g.seats.map((s,i)=>!s.folded?i:-1).filter(i=>i>=0);
const able=(g:Poker)=>live(g).filter(i=>g.seats[i].stack>0);
const next=(g:Poker,from:number,list:number[])=>{for(let k=1;k<=4;k++){const n=(from+k)%4;if(list.includes(n))return n}return -1};
export const pot=(g:Poker)=>g.seats.reduce((n,s)=>n+s.paid,0);
export const toCall=(g:Poker,i=g.actor)=>Math.max(0,g.bet-g.seats[i].bet);
function pay(g:Poker,i:number,n:number){const s=g.seats[i],amount=Math.min(n,s.stack);s.stack-=amount;s.paid+=amount;s.bet+=amount;return amount}
function note(g:Poker,i:number,msg:string){g.seats[i].action=msg;g.log.unshift(`${g.seats[i].name}: ${msg}`)}
export function settle(g:Poker){
 const playing=live(g);g.done=true;g.actor=-1;g.pending=[];g.showdown=playing.length>1;
 const scores=g.seats.map(s=>evaluate([...s.cards,...g.board]).score);
 const levels=[...new Set(g.seats.map(s=>s.paid).filter(Boolean))].sort((a,b)=>a-b);let previous=0;
 for(const cap of levels){const contributors=g.seats.map((s,i)=>s.paid>=cap?i:-1).filter(i=>i>=0);const amount=(cap-previous)*contributors.length;previous=cap;const eligible=contributors.filter(i=>!g.seats[i].folded);if(!eligible.length)throw Error('Invalid side pot');const best=Math.max(...eligible.map(i=>scores[i]));const winners=eligible.filter(i=>scores[i]===best);const order=Array.from({length:4},(_,i)=>(g.button+1+i)%4).filter(i=>winners.includes(i));order.forEach((i,k)=>g.seats[i].payout+=Math.floor(amount/order.length)+(k<amount%order.length?1:0));}
 g.winners=g.seats.map((s,i)=>s.payout>0?i:-1).filter(i=>i>=0);g.seats.forEach((s,i)=>{s.stack+=s.payout;if(!s.folded)s.action=s.payout?`Collects ${s.payout}`:'Showdown';});
 g.result=g.winners.map(i=>`${g.seats[i].name} collects ${g.seats[i].payout}`).join(' · ')+(g.showdown?'':' · Uncontested');g.log.unshift(g.result);return g;
}
function advance(g:Poker,from:number):Poker{
 if(live(g).length===1)return settle(g);
 g.pending=g.pending.filter(i=>!g.seats[i].folded&&g.seats[i].stack>0);
 if(able(g).length<=1){const only=able(g)[0];g.pending=only!==undefined&&toCall(g,only)>0?[only]:[];}
 if(g.pending.length){g.actor=next(g,from,g.pending);return g;}
 if(g.street===3)return settle(g);
 g.street++;g.board.push(...g.shoe.splice(0,g.street===1?3:1));g.bet=0;g.raises=0;g.seats.forEach(s=>s.bet=0);g.pending=able(g);g.log.unshift(`${['','Flop','Turn','River'][g.street]} dealt`);return advance(g,g.button);
}
export function newPoker(buyIn:number,button=0,shoe=deck()):Poker{
 const d=[...shoe],seats=['You','Atlas','Mika','Nova'].map((name,i)=>({name,cards:d.splice(0,2),stack:i===0?buyIn:2000,paid:0,bet:0,folded:false,action:'Ready',payout:0}));
 const g:Poker={seats,board:[],shoe:d,street:0,actor:0,pending:[0,1,2,3],bet:50,raises:0,button,done:false,showdown:false,log:[],winners:[],result:'',initial:buyIn+6000};
 if(!Number.isInteger(buyIn)||buyIn<100)throw Error('Minimum buy-in is 100');
 const sb=(button+1)%4,bb=(button+2)%4;note(g,sb,`Small blind ${pay(g,sb,25)}`);note(g,bb,`Big blind ${pay(g,bb,50)}`);return advance(g,bb);
}
export function legal(g:Poker):Action[]{if(g.done)return [];const s=g.seats[g.actor],cost=toCall(g),a:Action[]=['fold',cost?'call':'check'];if(g.raises<3&&s.stack>=cost+100&&able(g).length>1)a.push('raise');return a}
export function pokerAction(state:Poker,action:Action):Poker{
 if(!legal(state).includes(action))throw Error('Illegal action');const g=structuredClone(state),i=g.actor,s=g.seats[i],cost=toCall(g);g.pending=g.pending.filter(n=>n!==i);
 if(action==='fold'){s.folded=true;note(g,i,'Fold');}
 else if(action==='check')note(g,i,'Check');
 else if(action==='call'){const n=pay(g,i,cost);note(g,i,`Call ${n}${s.stack===0?' · all-in':''}`);}
 else{pay(g,i,cost+100);g.bet=s.bet;g.raises++;g.pending=able(g).filter(n=>n!==i);note(g,i,`${cost?'Raise':'Bet'} to ${s.bet}`);}
 return advance(g,i);
}
export function estimateEquity(hole:Card[],board:Card[],opponents:number,trials=100,rng:()=>number=Math.random){
 const known=new Set([...hole,...board].map(c=>c.rank+c.suit));const available=['♠','♥','♦','♣'].flatMap(suit=>Array.from({length:13},(_,i)=>({rank:i+2,suit}))).filter(c=>!known.has(c.rank+c.suit));let wins=0;
 for(let t=0;t<trials;t++){const d=[...available],take=()=>d.splice(Math.floor(rng()*d.length),1)[0];const publicCards=[...board];while(publicCards.length<5)publicCards.push(take());const mine=evaluate([...hole,...publicCards]).score;let tied=1,beaten=false;for(let k=0;k<opponents;k++){const other=evaluate([take(),take(),...publicCards]).score;if(other>mine)beaten=true;else if(other===mine)tied++;}if(!beaten)wins+=1/tied;}
 return wins/trials;
}
export function botDecision(g:Poker,difficulty:Difficulty='standard',rng:()=>number=Math.random):Action{
 const i=g.actor,actions=legal(g),s=g.seats[i],cost=Math.min(toCall(g),s.stack),opponents=live(g).length-1;
 // Deliberately pass only this bot's hole cards and already-revealed community cards.
 const equity=estimateEquity(s.cards,g.board,opponents,difficulty==='expert'?180:difficulty==='casual'?35:90,rng);
 const odds=cost/(pot(g)+cost),personality=[0,.02,-.025,.075][i];const noise=(rng()-.5)*(difficulty==='casual'?.3:.07);const strength=equity+noise;
 if(cost&&strength<odds+(difficulty==='casual'?-.08:.025)&&rng()>.06)return 'fold';
 const bluff=rng()<(difficulty==='casual'?.025:.065+Math.max(0,personality));
 if(actions.includes('raise')&&(strength>.53-personality||(bluff&&g.raises<2&&s.stack>cost+300)))return 'raise';
 return cost?'call':'check';
}
