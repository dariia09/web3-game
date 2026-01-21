import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {encryptPdf,parseKey} from '../server/pdf-crypto.mjs';
const input=process.argv[2];
if(!input)throw Error('Usage: npm run design:encrypt -- /path/to/optimized.pdf');
let key;
try {key=parseKey(process.env.DESIGN_PDF_KEY || (await readFile('.secrets/design-book.key','utf8')).trim());}
catch(error){
 if(error.code!=='ENOENT')throw error;
 key=randomBytes(32);await mkdir('.secrets',{recursive:true});
 await writeFile('.secrets/design-book.key',key.toString('hex')+'\n',{mode:0o600,flag:'wx'});
}
const plain=await readFile(resolve(input));
try{await mkdir('private',{recursive:true});await writeFile('private/design-book.rcenc',encryptPdf(plain,key));console.log('Encrypted design book saved. Plaintext source was not copied into the project.');}
finally{plain.fill(0);key.fill(0);}
