import fs from 'node:fs/promises';
import { lessons, sources, sectors } from './src/content.mjs';
import katex from 'katex';
const [template, css, js] = await Promise.all(['src/template.html','src/style.css','src/app.js'].map(p=>fs.readFile(p,'utf8')));
const math = text => text.replace(/\[\[math:([\s\S]*?)\]\]/g,(_,tex)=>katex.renderToString(tex,{output:'mathml',throwOnError:true}));
const data = JSON.stringify({lessons:lessons.map(l=>({...l,body:math(l.body)})),sources,sectors}).replace(/</g,'\u003c');
await fs.writeFile('index.html', template.replace('/* STYLES */',()=>css).replace('/* COURSE_DATA */',()=>`const COURSE = ${data};`).replace('/* APPLICATION */',()=>js));
console.log(`Built index.html: ${lessons.length} lessons, ${sources.length} curated sources.`);
