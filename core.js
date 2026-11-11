(function(root){'use strict';
const data=typeof module==='object'&&module.exports?require('./stages.js'):root.PuzzleRoadData;
const normalize=cells=>{const mx=Math.min(...cells.map(c=>c[0])),my=Math.min(...cells.map(c=>c[1]));return cells.map(([x,y])=>[x-mx,y-my]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);};
const transform=(cells,kind)=>normalize(cells.map(([x,y])=>kind==='rotate'?[y,-x]:kind==='horizontal'?[-x,y]:kind==='vertical'?[x,-y]:[x,y]));
const copy=value=>JSON.parse(JSON.stringify(value));
const passwords=['','SHMT','HAIA','IRCG','NUHO','OSIN','BUNO','UGOU','RIKR','ETUA','DENY','ONOU','IASU','RTHC','OSIH','NUNI','IKOI','IIBD','DTUE','EAMT','NROE','IUJM','KRII','EAZR','RSUE','IHRB','WIIA','ASTM','GHAA','AIRS','KREH','OOYI','ITUR','HAEO','AHNN','MEII','ONMZ','NOIO','OKDF','YOAU','ARRJ','OOEI'];
const order=Object.keys(data.shapes);
function available(index){const ids=new Set();for(let i=0;i<=index;i++)data.stages[i].pieces.forEach(id=>ids.add(id));return order.filter(id=>ids.has(id));}
class Game{
 constructor(index=0){if(!Number.isInteger(index)||index<0||index>=42)throw new RangeError('Invalid stage');this.index=index;this.stage=data.stages[index];this.available=available(index);this.reset();}
 reset(){this.placed={};this.selected=null;this.history=[];this.moves=0;this.won=false;this.cursor={x:0,y:0};}
 snapshot(){return {placed:copy(this.placed),moves:this.moves,won:this.won};}
 occupancy(){const map=new Map();for(const [id,p]of Object.entries(this.placed))for(const [dx,dy]of p.cells)map.set(`${p.x+dx},${p.y+dy}`,id);return map;}
 select(id){if(this.won||!this.available.includes(id))return false;this.cancel();const before=this.snapshot(),old=this.placed[id];this.selected={id,cells:copy(old?.cells||data.shapes[id]),before};if(old){this.cursor={x:old.x,y:old.y};delete this.placed[id];}return true;}
 cancel(){if(!this.selected)return false;const {before}=this.selected;this.placed=copy(before.placed);this.moves=before.moves;this.won=before.won;this.selected=null;return true;}
 change(kind){if(!this.selected||!['rotate','horizontal','vertical'].includes(kind))return false;this.selected.cells=transform(this.selected.cells,kind);return true;}
 move(dx,dy){if(!Number.isInteger(dx)||!Number.isInteger(dy))return;this.cursor.x=Math.max(0,Math.min(this.stage.board[0].length-1,this.cursor.x+dx));this.cursor.y=Math.max(0,Math.min(this.stage.board.length-1,this.cursor.y+dy));}
 canPlace(x,y){if(!this.selected||!Number.isInteger(x)||!Number.isInteger(y))return false;const occupied=this.occupancy();return this.selected.cells.every(([dx,dy])=>this.stage.board[y+dy]?.[x+dx]==='#'&&!occupied.has(`${x+dx},${y+dy}`));}
 place(x=this.cursor.x,y=this.cursor.y){if(!this.canPlace(x,y))return false;const {id,cells,before}=this.selected;this.history.push(before);this.placed[id]={x,y,cells:copy(cells)};this.selected=null;this.moves++;this.won=this.filled()===this.area();return true;}
 remove(id){this.cancel();if(!this.placed[id])return false;this.history.push(this.snapshot());delete this.placed[id];this.moves++;this.won=false;return true;}
 undo(){if(this.selected)return this.cancel();const previous=this.history.pop();if(!previous)return false;this.placed=copy(previous.placed);this.moves=previous.moves;this.won=previous.won;return true;}
 area(){return this.stage.board.join('').split('#').length-1;}
 filled(){return Object.values(this.placed).reduce((n,p)=>n+p.cells.length,0);}
}
const api={Game,normalize,transform,passwords,available,data};
if(typeof module==='object'&&module.exports)module.exports=api;else root.PuzzleRoad=api;
})(typeof globalThis!=='undefined'?globalThis:this);
