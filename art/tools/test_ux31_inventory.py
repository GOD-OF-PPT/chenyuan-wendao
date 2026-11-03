import hashlib,json,shutil,tempfile,unittest
from pathlib import Path
from ux31_inventory import FACTS,GROUPS,REFS,LEDGER,validate_ux31,prior_ux31_bytes

ROOT=Path(__file__).resolve().parents[2]

class ReadabilityContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        names={LEDGER,*REFS,*['web/src/'+n for n in FACTS]}
        for name,g in GROUPS.items():
            names.add('art/redesign/'+name+'.json')
            names.update(g['files'])
        for name in names:
            out=self.root/name
            out.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(ROOT/name,out)

    def resign(self,name):
        p=self.root/LEDGER
        m=json.loads(p.read_text())
        for r in m['files']:
            if r['path']=='web/src/'+name:
                data=(self.root/r['path']).read_bytes()
                r.update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
        p.write_text(json.dumps(m))

    def mutate(self,name,before,after):
        p=self.root/'web/src'/name
        text=p.read_text()
        self.assertIn(before,text)
        p.write_text(text.replace(before,after,1))
        self.resign(name)

    def test_current_whole_sources_reverse_exactly_and_actual_old_caps_hold(self):
        recorded,total=validate_ux31(self.root)
        self.assertEqual(total,70893)
        self.assertIn(LEDGER,recorded)
        for name,f in FACTS.items():
            self.assertEqual(prior_ux31_bytes(name,(self.root/'web/src'/name).read_bytes()),(self.root/f['baseline']).read_bytes())
        self.assertEqual(sum((self.root/p).stat().st_size for p in GROUPS['art03']['files']),44995)
        self.assertEqual(sum((self.root/p).stat().st_size for p in GROUPS['idle-preparation']['files']),59991)

    def test_resigning_a_write_callback_change_does_not_make_it_display_only(self):
        self.mutate('LearningPlanner.vue',"emit('start',plan)","emit('start',{...plan,stoneBudget:999999})")
        with self.assertRaises(AssertionError):validate_ux31(self.root)

    def test_resigning_a_script_change_is_rejected(self):
        self.mutate('RecoveryPlanner.vue','count=ref(3)','count=ref(50)')
        with self.assertRaises(AssertionError):validate_ux31(self.root)

    def test_complete_paused_progress_cannot_be_removed(self):
        self.mutate('LearningPlanner.vue','{{restart.summary}}','')
        with self.assertRaises(AssertionError):validate_ux31(self.root)

    def test_finite_reserve_value_cannot_be_replaced_with_cosmetic_text(self):
        self.mutate('RecoveryPlanner.vue',"库存保留 '+reserve","库存保留 '+0")
        with self.assertRaises(AssertionError):validate_ux31(self.root)

    def test_fallback_cannot_be_hidden_or_shrunk_to_pass(self):
        self.mutate('art11-inventory.css','bottom:6px','bottom:6px;font-size:8px;overflow:hidden')
        with self.assertRaises(AssertionError):validate_ux31(self.root)

    def test_old_group_ledger_and_cap_cannot_be_resigned(self):
        p=self.root/'art/redesign/art03.json';m=json.loads(p.read_text());m['maxNativeBytes']=45001;p.write_text(json.dumps(m))
        with self.assertRaises(AssertionError):validate_ux31(self.root)

    def test_reverting_a_consumer_silently_does_not_pass_current_contract(self):
        name='MarketCounter.vue'
        shutil.copyfile(self.root/FACTS[name]['baseline'],self.root/'web/src'/name)
        self.resign(name)
        with self.assertRaises(AssertionError):validate_ux31(self.root)

    def test_original_whole_file_must_remain_immutable(self):
        p=self.root/FACTS['JadeStudyScene.vue']['baseline'];p.write_text(p.read_text()+'\n')
        with self.assertRaises(AssertionError):validate_ux31(self.root)

    def test_no_unrecorded_assets_or_reduced_budget_claim(self):
        p=self.root/LEDGER;m=json.loads(p.read_text());m['newRasterAssets']=1;p.write_text(json.dumps(m))
        with self.assertRaises(AssertionError):validate_ux31(self.root)

if __name__=='__main__':unittest.main()
