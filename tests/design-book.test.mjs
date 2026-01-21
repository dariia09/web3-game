import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtemp,writeFile,mkdir,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encryptPdf,decryptPdf,parseKey} from '../server/pdf-crypto.mjs';
import {createDesignHandler} from '../server/design-book.mjs';
const pdf=Buffer.from('%PDF-1.7\nprotected test document\n%%EOF');
test('PDF envelope roundtrips and uses a fresh nonce each time',()=>{
 const key=randomBytes(32),a=encryptPdf(pdf,key),b=encryptPdf(pdf,key);
 assert.notDeepEqual(a,b);assert.deepEqual(decryptPdf(a,key),pdf);
 assert.equal(a.includes(Buffer.from('%PDF-')),false);
});
test('wrong keys and tampered header, nonce, tag or payload fail closed',()=>{
 const key=randomBytes(32),a=encryptPdf(pdf,key);
 assert.throws(()=>decryptPdf(a,randomBytes(32)));
 for(const offset of [0,8,20,36]){const b=Buffer.from(a);b[offset]^=1;assert.throws(()=>decryptPdf(b,key));}
 assert.throws(()=>parseKey('short'));assert.throws(()=>encryptPdf(Buffer.from('not a PDF'),key));
});
async function fixture(t,env){
 const root=await mkdtemp(join(tmpdir(),'river-design-'));
 const key=randomBytes(32);await mkdir(join(root,'private'));
 await writeFile(join(root,'private/design-book.rcenc'),encryptPdf(pdf,key));
 const server=createServer(createDesignHandler({root,env:{DESIGN_PDF_KEY:key.toString('hex'),...env}}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});});
 return {url:`http://127.0.0.1:${server.address().port}/api/design-book`,root};
}
test('public mode serves metadata by GET and PDF by no-store POST only',async t=>{
 const {url}=await fixture(t,{});
 const info=await(await fetch(url)).json();assert.equal(info.locked,false);assert.equal(info.pages,8);
 const response=await fetch(url,{method:'POST'});assert.equal(response.status,200);
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal(response.headers.get('content-type'),'application/pdf');
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),pdf);
 assert.equal((await fetch(url,{method:'PUT'})).status,405);
});
test('access code blocks missing and wrong credentials; correct credentials render',async t=>{
 const {url}=await fixture(t,{DESIGN_ACCESS_CODE:'private-review-test-code'});
 assert.equal((await(await fetch(url)).json()).locked,true);
 assert.equal((await fetch(url,{method:'POST'})).status,401);
 assert.equal((await fetch(url,{method:'POST',headers:{Authorization:'Bearer wrong'}})).status,401);
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer private-review-test-code'}});
 assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),pdf);
});
test('cross-origin requests and invalid ciphertext cannot expose PDF bytes',async t=>{
 const {url,root}=await fixture(t,{});
 assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://other.example'}})).status,403);
 await writeFile(join(root,'private/design-book.rcenc'),Buffer.from('corrupt'));
 const response=await fetch(url,{method:'POST'});assert.equal(response.status,503);
 assert.equal((await response.text()).includes('%PDF-'),false);
});
test('missing server key fails closed without exposing paths or credentials',async t=>{
 const {url}=await fixture(t,{DESIGN_PDF_KEY:undefined});
 const response=await fetch(url,{method:'POST'});assert.equal(response.status,503);
 assert.equal((await response.text()).includes('.secrets'),false);
});
test('bundled encrypted asset authenticates with the owner local key',async()=>{
 const key=parseKey(process.env.DESIGN_PDF_KEY || (await readFile('.secrets/design-book.key','utf8')).trim());
 const bytes=decryptPdf(await readFile('private/design-book.rcenc'),key);
 assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length<3000000);
 bytes.fill(0);key.fill(0);
});
