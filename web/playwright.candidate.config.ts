import {defineConfig} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {sourceIdentity} from '../scripts/source-identity.mjs';
const directory=process.env.CANDIDATE_DIRECTORY;if(!directory)throw new Error('CANDIDATE_DIRECTORY must name a verified extracted package');
const archive=path.resolve(directory,'../candidate.zip'),hash=createHash('sha256').update(fs.readFileSync(archive)).digest('hex');const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
export default defineConfig({
  forbidOnly:!!process.env.CI,testDir:'./candidate-tests',timeout:60000,expect:{timeout:8000},workers:1,retries:0,reporter:[['list'],['json',{outputFile:'candidate-report/results.json'}]],outputDir:'candidate-results',metadata:{chenyuan:sourceIdentity(),candidateArchiveSha256:hash},projects:['chromium','firefox','webkit'].map(name=>({name,use:{browserName:name as 'chromium'|'firefox'|'webkit',...(name==='firefox'?{launchOptions:{firefoxUserPrefs:{'network.proxy.type':0}}}:{})}})),use:{baseURL:'http://127.0.0.1:4179/showcase/',viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000,trace:'retain-on-failure'},webServer:{command:'python3 '+quote(path.join(directory,'serve.py'))+' --port 4179 --base /showcase/',url:'http://127.0.0.1:4179/showcase/',reuseExistingServer:false}});
