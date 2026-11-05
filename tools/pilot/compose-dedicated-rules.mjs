import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const candidate=readFileSync(resolve(root,'docs/pilot/security/firestore.va-01-8.candidate.rules'),'utf8');
const legacy=readFileSync(resolve(root,'docs/pilot/security/firestore.legacy-compatibility.rules.fragment'),'utf8');
const marker='    match /{document=**} {';
if(candidate.split(marker).length!==2)throw Error('RULES_COMPOSITION_ANCHOR_CHANGED');
const result=candidate.replace('// Not referenced by the root firebase.json and not deployed.','// Composed dedicated pilot candidate. Deployment uses firebase.dedicated.json only.')
  .replace(marker,()=>legacy+'\n'+marker);
writeFileSync(resolve(root,'firestore.dedicated.rules'),result);
console.log('Dedicated pilot rules composed; no deployment performed.');
