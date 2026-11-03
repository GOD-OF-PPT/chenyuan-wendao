import json,shutil,tempfile,unittest
from pathlib import Path
from ux32_inventory import LEDGER,MANIFEST,FACTS,prior_ux32_bytes,validate_ux32

ROOT=Path(__file__).resolve().parents[2]
class MarketCopyContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
        for n in {LEDGER,*MANIFEST['sourceReferences'],*['web/src/'+n for n in FACTS]}:
            target=self.root/n;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/n,target)
    def reject_change(self,name,before,after):
        f=self.root/'web/src'/name;s=f.read_text();self.assertIn(before,s);f.write_text(s.replace(before,after,1))
        with self.assertRaises(AssertionError):validate_ux32(self.root)
    def test_current_whole_inverse_keeps_both_original_scripts_and_styles(self):
        files,total=validate_ux32(self.root);self.assertEqual(total,22535);self.assertIn(LEDGER,files)
        for name,f in FACTS.items():self.assertEqual(prior_ux32_bytes(name,(self.root/'web/src'/name).read_bytes()),(self.root/f['baseline']).read_bytes())
    def test_actual_start_callback_cannot_change(self):self.reject_change('MarketPlanner.vue',"emit('start',plan)","emit('travel',plan)")
    def test_cumulative_budget_cannot_become_a_fake_zero(self):self.reject_change('MarketPlanner.vue',"'灵石上限 '+budget","'灵石上限 '+0")
    def test_full_original_paused_progress_cannot_disappear(self):self.reject_change('MarketPlanner.vue','{{restart.summary}}','')
    def test_failed_trade_cannot_claim_a_completed_reward(self):self.reject_change('MarketCounter.vue',"'保存待核对 · 请查看上方提示'","'交易成功'")
    def test_countdown_cannot_change(self):self.reject_change('MarketCounter.vue','runtime.remainingMs/1000','0')
    def test_immutable_original_cannot_be_replaced(self):
        f=self.root/FACTS['MarketPlanner.vue']['baseline'];f.write_text(f.read_text()+'\n')
        with self.assertRaises(AssertionError):validate_ux32(self.root)
    def test_scope_cannot_claim_human_approval(self):
        f=self.root/LEDGER;m=json.loads(f.read_text());m['userAcceptance']=True;f.write_text(json.dumps(m))
        with self.assertRaises(AssertionError):validate_ux32(self.root)
    def test_missing_ledger_cannot_leave_the_new_ui_unrecorded(self):
        (self.root/LEDGER).unlink()
        with self.assertRaises(AssertionError):validate_ux32(self.root)

if __name__=='__main__':unittest.main()
