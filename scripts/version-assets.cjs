'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'index.html');
const html=fs.readFileSync(file,'utf8');
// A shared version keeps the stylesheet and classic scripts on one release.
// Normalize line endings so Windows and deployment checkouts agree.
const refs=[...html.matchAll(/(?:href|src)="((?:css|js)\/[^"?]+\.(?:css|js))(?:\?[^" ]*)?"/g)].map(m=>m[1]);
if(!refs.length)throw Error('No application assets found');
const hash=createHash('sha256');
for(const ref of refs){hash.update(ref);hash.update(fs.readFileSync(path.join(root,ref),'utf8').replace(/\r\n/g,'\n'));}
const version=hash.digest('hex').slice(0,12);
const next=html.replace(/((?:href|src)="(?:css|js)\/[^"?]+\.(?:css|js))(?:\?[^" ]*)?"/g,`$1?v=${version}"`);
if(process.argv.includes('--check')){
  if(next!==html)throw Error('Asset versions are stale. Run node scripts/version-assets.cjs before publishing.');
}else fs.writeFileSync(file,next);
console.log('Application asset version: '+version);
