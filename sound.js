(function(root){'use strict';
const patterns={
 enable:[[440,0,.06],[660,.07,.08]],
 select:[[440,0,.045],[554,.04,.055]],
 move:[[180,0,.024]],
 rotate:[[392,0,.04],[523,.035,.06]],
 flip:[[523,0,.04],[392,.04,.06]],
 place:[[523,0,.045],[784,.05,.075]],
 back:[[392,0,.045],[294,.045,.055]],
 invalid:[[150,0,.07]],
 clear:[[523,0,.09],[659,.1,.09],[784,.2,.09],[1047,.31,.16]]
};
class Sound{
 constructor(factory){this.factory=factory||(()=>{const Audio=root.AudioContext||root.webkitAudioContext;return Audio?new Audio():null;});this.context=null;this.master=null;this.voices=new Set();this.enabled=false;this.paused=false;this.revision=0;this.lastMove=-Infinity;this.onchange=null;}
 async setEnabled(value){
  const revision=++this.revision;this.enabled=!!value;
  if(!this.enabled){this.stop();return true;}
  try{
   if(!this.context){this.context=this.factory();if(!this.context)throw Error('Audio unavailable');this.master=this.context.createGain();this.master.gain.value=.08;this.master.connect(this.context.destination);}
   if(this.context.state==='suspended')await this.context.resume();
   if(revision!==this.revision)return false;
   if(this.context.state!=='running')throw Error('Audio unavailable');
   this.master.gain.setValueAtTime(this.paused?0:.08,this.context.currentTime);return true;
  }catch{if(revision===this.revision){this.enabled=false;this.stop();}return false;}
 }
 setPaused(value){this.paused=!!value;if(this.paused)this.stop();try{if(this.master)this.master.gain.setValueAtTime(this.enabled&&!this.paused ? .08 : 0,this.context.currentTime);}catch{}}
 release(voice){if(voice.released)return;voice.released=true;voice.osc.onended=null;try{voice.osc.stop();}catch{}try{voice.osc.disconnect();voice.gain.disconnect();}catch{}this.voices.delete(voice);}
 stop(){for(const voice of [...this.voices])this.release(voice);try{if(this.master)this.master.gain.setValueAtTime(0,this.context.currentTime);}catch{}}
 play(kind){
  const context=this.context;
  if(!this.enabled||this.paused||!context||context.state!=='running'||typeof kind!=='string'||!Object.hasOwn(patterns,kind))return false;
  const now=context.currentTime;
  try{
  if(kind==='move'&&now-this.lastMove<.11)return false;
  if(kind==='move')this.lastMove=now;
  if(kind==='clear')this.stop();
  this.master.gain.setValueAtTime(.08,now);
  for(const [frequency,delay,duration]of patterns[kind]){
   while(this.voices.size>=6)this.release(this.voices.values().next().value);
   const osc=context.createOscillator(),gain=context.createGain(),start=now+delay,end=start+duration,voice={osc,gain,released:false};
   osc.type='square';osc.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.3,start+.005);gain.gain.exponentialRampToValueAtTime(.0001,end);
   osc.connect(gain);gain.connect(this.master);this.voices.add(voice);osc.onended=()=>this.release(voice);osc.start(start);osc.stop(end+.005);
  }
  return true;
  }catch{this.enabled=false;this.stop();try{this.onchange?.(false);}catch{}return false;}
 }
}
if(typeof module==='object'&&module.exports)module.exports={Sound,patterns};else root.PuzzleRoadSound=Sound;
})(typeof globalThis!=='undefined'?globalThis:this);
