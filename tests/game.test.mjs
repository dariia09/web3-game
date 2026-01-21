import test from 'node:test';
import assert from 'node:assert/strict';
import {deck,evaluate,total} from '../src/lib/game/cards.ts';
test('shuffled deck contains 52 unique cards',()=>{const d=deck();assert.equal(d.length,52);assert.equal(new Set(d.map(x=>x.rank+x.suit)).size,52)});
test('best five of seven selects royal flush',()=>{const cards=[10,11,12,13,14].map(rank=>({rank,suit:'♠'}));cards.push({rank:2,suit:'♥'},{rank:2,suit:'♣'});assert.equal(evaluate(cards).name,'Straight flush')});
test('ace-low straight is below six-high straight',()=>{const suits=['♠','♥','♦','♣','♠'];const hand=r=>r.map((rank,i)=>({rank,suit:suits[i]}));assert.ok(evaluate(hand([2,3,4,5,6])).score>evaluate(hand([14,2,3,4,5])).score)});
test('blackjack soft aces adjust without busting',()=>{assert.equal(total([{rank:14,suit:'♠'},{rank:14,suit:'♥'},{rank:9,suit:'♣'}]),21)});
