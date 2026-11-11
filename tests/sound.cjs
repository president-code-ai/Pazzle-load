'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {Sound}=require('../sound.js');
class Param{
 constructor(){this.value=0;this.events=[];}
 setValueAtTime(value,time){assert.ok(Number.isFinite(value)&&Number.isFinite(time));this.value=value;this.events.push(['set',value,time]);}
 linearRampToValueAtTime(value,time){this.setValueAtTime(value,time);}
 exponentialRampToValueAtTime(value,time){assert.ok(value>0);this.setValueAtTime(value,time);}
}
class Node{
 constructor(){this.gain=new Param();this.frequency=new Param();this.connected=false;this.stops=[];this.starts=[];this.onended=null;}
 connect(){this.connected=true;}
 disconnect(){this.connected=false;}
 start(time){this.starts.push(time);}
 stop(time){this.stops.push(time);}
 finish(){this.onended?.();}
}
class Context{
 constructor(){this.state='running';this.currentTime=0;this.destination={};this.oscillators=[];this.gains=[];}
 createGain(){const node=new Node();this.gains.push(node);return node;}
 createOscillator(){const node=new Node();this.oscillators.push(node);return node;}
 async resume(){this.state='running';}
}
test('OFF never initializes audio or schedules a note',async()=>{let created=0;const sound=new Sound(()=>{created++;return new Context();});assert.equal(sound.play('select'),false);assert.equal(await sound.setEnabled(false),true);sound.setPaused(true);sound.setPaused(false);assert.equal(created,0);assert.equal(sound.context,null);});
test('finite scheduled notes end, disconnect and release resources',async()=>{const context=new Context(),sound=new Sound(()=>context);assert.ok(await sound.setEnabled(true));assert.ok(sound.play('select'));assert.equal(sound.voices.size,2);for(const osc of context.oscillators){assert.ok(osc.starts[0]>=0);assert.ok(osc.stops[0]>osc.starts[0]);osc.finish();assert.equal(osc.connected,false);}assert.equal(sound.voices.size,0);});
test('rapid events stay within six voices, OFF stops and disconnects all of them',async()=>{const context=new Context(),sound=new Sound(()=>context);await sound.setEnabled(true);for(let i=0;i<100;i++){sound.play('rotate');assert.ok(sound.voices.size<=6);}assert.equal(sound.voices.size,6);await sound.setEnabled(false);assert.equal(sound.voices.size,0);assert.equal(sound.master.gain.value,0);assert.ok(context.oscillators.every(node=>!node.connected&&node.stops.some(time=>time===undefined)));assert.equal(sound.play('place'),false);});
test('movement is rate limited and unknown cue names do not disable audio',async()=>{const context=new Context(),sound=new Sound(()=>context);await sound.setEnabled(true);assert.ok(sound.play('move'));context.currentTime=.05;assert.equal(sound.play('move'),false);context.currentTime=.12;assert.ok(sound.play('move'));assert.equal(sound.play('__proto__'),false);assert.equal(sound.play('missing'),false);assert.equal(sound.enabled,true);});
test('pause silences scheduled notes and blocks playback, unpause respects OFF',async()=>{const context=new Context(),sound=new Sound(()=>context);await sound.setEnabled(true);sound.play('clear');sound.setPaused(true);assert.equal(sound.voices.size,0);assert.equal(sound.master.gain.value,0);assert.equal(sound.play('select'),false);sound.setPaused(false);assert.ok(sound.play('select'));await sound.setEnabled(false);sound.setPaused(false);assert.equal(sound.master.gain.value,0);});
test('late resume cannot re-enable or unmute after OFF',async()=>{const context=new Context();context.state='suspended';let resolve;context.resume=()=>new Promise(done=>{resolve=()=>{context.state='running';done();};});const sound=new Sound(()=>context),pending=sound.setEnabled(true);await sound.setEnabled(false);resolve();assert.equal(await pending,false);assert.equal(sound.enabled,false);assert.equal(sound.master.gain.value,0);assert.equal(sound.play('clear'),false);});
test('the latest enable intent wins overlapping resumes',async()=>{const context=new Context();context.state='suspended';const resolves=[];context.resume=()=>new Promise(done=>resolves.push(()=>{context.state='running';done();}));const sound=new Sound(()=>context),first=sound.setEnabled(true);await sound.setEnabled(false);const latest=sound.setEnabled(true);resolves[1]();assert.ok(await latest);resolves[0]();assert.equal(await first,false);assert.equal(sound.enabled,true);assert.equal(sound.master.gain.value,.08);});
test('missing audio support or node failure stays silent and notifies UI',async()=>{const unsupported=new Sound(()=>null);assert.equal(await unsupported.setEnabled(true),false);assert.equal(unsupported.enabled,false);const context=new Context(),sound=new Sound(()=>context);await sound.setEnabled(true);sound.play('select');let notified;sound.onchange=value=>{notified=value;};context.createOscillator=()=>{throw Error('Audio device unavailable');};assert.equal(sound.play('rotate'),false);assert.equal(sound.enabled,false);assert.equal(notified,false);assert.equal(sound.voices.size,0);assert.equal(sound.master.gain.value,0);});
