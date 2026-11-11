'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Game,transform,normalize,passwords,available,data}=require('../core.js');
const key=c=>JSON.stringify(normalize(c));
function orient(game,target){for(let f=0;f<2;f++){for(let r=0;r<4;r++){if(key(game.selected.cells)===key(target))return;game.change('rotate');}game.change('horizontal');}throw Error('Unreachable shape');}
test('all 42 original mathematical boards are filled by their solutions using legal transforms',()=>{
 let count=0;
 for(const stage of data.stages){const game=new Game(stage.number-1);assert.equal(game.area(),stage.solution.reduce((n,p)=>n+p.cells.length,0));assert.equal(new Set(stage.pieces).size,stage.pieces.length);
 for(const p of stage.solution){assert.ok(game.select(p.id));orient(game,p.cells);assert.ok(game.canPlace(p.x,p.y));assert.ok(game.place(p.x,p.y));count++;}
 assert.equal(game.won,true,'stage '+stage.number);assert.equal(game.filled(),game.area());assert.equal(game.occupancy().size,game.area());assert.ok(game.undo());assert.equal(game.won,false);assert.equal(game.history.length,stage.solution.length-1);}
 assert.equal(count,442);
});
test('four rotations and double mirrors restore every block; area and connectivity remain',()=>{for(const cells of Object.values(data.shapes)){for(const kind of ['rotate','horizontal','vertical']){let c=cells;for(let i=0;i<(kind==='rotate'?4:2);i++){c=transform(c,kind);assert.equal(c.length,cells.length);assert.ok(c.every(([x,y])=>x>=0&&y>=0));}assert.equal(key(c),key(cells));}}});
test('rejects boundary overflow, overlap, unknown pieces, invalid coordinates and stages',()=>{
 const game=new Game();assert.equal(game.select('F'),false);assert.equal(game.select('__proto__'),false);assert.equal(game.place(0,0),false);game.select('T');
 for(const [x,y]of [[-1,0],[0,-1],[5,0],[0,3],[NaN,0],[Infinity,0],[0.5,0],['0',0]])assert.equal(game.place(x,y),false);
 const p=game.stage.solution[0];orient(game,p.cells);assert.equal(game.place(p.x,p.y),true);game.select('Y');assert.equal(game.canPlace(p.x,p.y),false);assert.equal(game.moves,1);
 for(const index of [-1,42,NaN,1.5,'1'])assert.throws(()=>new Game(index),RangeError);
});
test('picking, transforming and canceling restore placements and history exactly',()=>{
 const game=new Game(),p=game.stage.solution[0];game.select(p.id);orient(game,p.cells);game.place(p.x,p.y);const before=game.snapshot(),history=game.history.length;
 game.select(p.id);assert.equal(game.filled(),0);game.change('horizontal');game.change('rotate');assert.ok(game.cancel());assert.deepEqual(game.snapshot(),before);assert.equal(game.history.length,history);
 game.select(p.id);game.select('Y');assert.deepEqual(game.placed,before.placed);assert.equal(game.selected.id,'Y');game.undo();assert.equal(game.selected,null);assert.deepEqual(game.snapshot(),before);game.undo();assert.equal(game.filled(),0);assert.equal(game.moves,0);
});
test('removing a lifted placed block returns it to inventory, and undo restores it',()=>{const game=new Game(),p=game.stage.solution[0];game.select(p.id);orient(game,p.cells);game.place(p.x,p.y);const before=game.snapshot();game.select(p.id);assert.ok(game.remove(p.id));assert.equal(game.selected,null);assert.equal(game.filled(),0);assert.equal(game.moves,2);assert.ok(game.undo());assert.deepEqual(game.snapshot(),before);assert.equal(game.remove('INVALID'),false);});
test('all holes on irregular boards reject placement; every legal original placement works',()=>{for(let index=8;index<42;index++){const game=new Game(index),p=game.stage.solution[0];game.select(p.id);orient(game,p.cells);for(let y=0;y<game.stage.board.length;y++)for(let x=0;x<game.stage.board[0].length;x++){if(game.canPlace(x,y))assert.ok(game.selected.cells.every(([dx,dy])=>game.stage.board[y+dy]?.[x+dx]==='#'));}assert.ok(game.canPlace(p.x,p.y));}});
test('any valid filling wins, unused blocks allowed, final island uses 4-cell square',()=>{const game=new Game(2);assert.ok(available(2).includes('T'));assert.equal(game.stage.pieces.includes('T'),false);for(const p of game.stage.solution){game.select(p.id);orient(game,p.cells);assert.ok(game.place(p.x,p.y));}assert.ok(game.won);assert.ok(!game.placed.T);assert.equal(game.select('T'),false);assert.equal(new Game(41).area(),64);assert.equal(data.shapes.O.length,4);assert.equal(available(40).includes('O'),false);assert.equal(available(41).length,13);});
test('a different valid arrangement also wins without matching the stored example',()=>{const game=new Game();let changed=false;for(const p of game.stage.solution){const absolute=p.cells.map(([x,y])=>[4-p.x-x,2-p.y-y]),x=Math.min(...absolute.map(c=>c[0])),y=Math.min(...absolute.map(c=>c[1]));game.select(p.id);orient(game,absolute);assert.ok(game.place(x,y));if(x!==p.x||y!==p.y||key(game.placed[p.id].cells)!==key(p.cells))changed=true;}assert.ok(changed);assert.ok(game.won);});
test('cursor stays in bounds, reset clears selection, placements, moves and history',()=>{const game=new Game(23);game.move(-999,-999);assert.deepEqual(game.cursor,{x:0,y:0});game.move(999,999);assert.deepEqual(game.cursor,{x:5,y:13});game.move(NaN,0);assert.deepEqual(game.cursor,{x:5,y:13});game.select(game.available[0]);game.reset();assert.equal(game.selected,null);assert.equal(game.moves,0);assert.equal(game.filled(),0);assert.equal(game.undo(),false);});
test('password table covers 41 distinct original passwords and matches checkpoints',()=>{assert.equal(passwords.length,42);assert.equal(new Set(passwords.slice(1)).size,41);assert.ok(passwords.slice(1).every(p=>/^[A-Z]{4}$/.test(p)));assert.equal(passwords[1],'SHMT');assert.equal(passwords[41],'OOEI');});
test('game resources are local and page code has no network, dynamic HTML, evaluation or storage APIs',()=>{
 const base=path.join(__dirname,'..'),html=fs.readFileSync(path.join(base,'index.html'),'utf8'),js=['app.js','core.js','stages.js'].map(f=>fs.readFileSync(path.join(base,f),'utf8')).join('\n');
 assert.match(html,/connect-src 'none'/);assert.match(html,/object-src 'none'/);assert.doesNotMatch(html,/<script[^>]*src=["']https?:|<link[^>]*href=["']https?:|\son\w+=/i);assert.doesNotMatch(js,/\b(fetch|XMLHttpRequest|WebSocket|eval|localStorage|sessionStorage|indexedDB)\s*\(|\.innerHTML\s*=|document\.cookie|new\s+Function/);
 for(const resource of [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)].map(m=>m[1]))assert.ok(fs.existsSync(path.join(base,resource)),resource);
});
