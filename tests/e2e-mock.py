"""End-to-end UI check: loads manager.html with a stubbed chrome.* API."""
import json
import pathlib
import sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

MOCK = r"""
(() => {
  const tree = [{id:'0',title:'',children:[
    {id:'1',title:'Bookmarks bar',parentId:'0',children:[
      {id:'10',title:'OpenAI Platform',url:'https://platform.openai.com/docs?utm_source=x',parentId:'1',dateAdded:1},
      {id:'11',title:'OpenAI Platform',url:'https://platform.openai.com/docs',parentId:'1',dateAdded:2},
      {id:'12',title:'Dev',parentId:'1',children:[
        {id:'13',title:'GitHub',url:'https://github.com',parentId:'12',dateAdded:3},
        {id:'14',title:'EmptyFolder',parentId:'12',children:[]}
      ]}
    ]},
    {id:'2',title:'Other bookmarks',parentId:'0',children:[]}
  ]}];
  const store = {};
  const p = (fn) => (...args) => { const cb = args[args.length-1]; if (typeof cb === 'function') setTimeout(()=>cb(fn(...args.slice(0,-1))),0); };
  const find = (n, id) => { if (!n) return null; if (n.id===id) return n; for (const c of (n.children||[])) { const r=find(c,id); if (r) return r; } return null; };
  window.chrome = {
    runtime: { lastError: null, getURL: (v)=>v },
    storage: { local: {
      get: p((k)=>({[k]: store[k]})),
      set: (obj, cb)=>{ Object.assign(store,obj); if(cb) setTimeout(cb,0); }
    }},
    bookmarks: {
      getTree: p(()=>tree),
      getChildren: p((id)=>{ const n=find(tree[0],id); return n&&n.children? n.children:[]; }),
      get: p((id)=>[find(tree[0],id)]),
      create: p((data)=>({id:String(Math.floor(Math.random()*100000)),...data})),
      move: p(()=>({})),
      remove: p(()=>({})),
      removeTree: p(()=>({})),
      update: p(()=>({}))
    },
    tabs: { create: p(()=>({})), query: p(()=>[]) },
    action: { onClicked: { addListener(){} } }
  };
})();
"""


def main():
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=CHROME)
        page = browser.new_page()
        page.add_init_script(MOCK)
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        url = (ROOT / "manager.html").as_uri()
        page.goto(url)
        page.wait_for_timeout(2500)

        print("TITLE", page.title())
        print("ENGINES", page.evaluate(
            "JSON.stringify([!!globalThis.SMCore,!!globalThis.SMBackup,!!globalThis.SMDedupe,"
            "!!globalThis.SMLinkChecker,!!globalThis.SMPortableIO])"))

        page.click("#scan-duplicates")
        page.wait_for_timeout(1500)
        print("DUP_GROUPS", page.evaluate("document.querySelectorAll('#duplicate-results .result-group').length"))
        print("DUP_CHECKBOXES", page.evaluate("document.querySelectorAll('#duplicate-results .dup-checkbox').length"))

        page.click("#snapshot-create")
        page.wait_for_timeout(1500)
        print("SNAPSHOT_ROWS", page.evaluate("document.querySelectorAll('#snapshot-results .result-group').length"))
        print("SNAPSHOT_STATUS", page.evaluate("document.getElementById('snapshot-result').textContent"))

        print("PAGE_ERRORS", json.dumps(errors[:10]))
        browser.close()

    if errors:
        print("E2E_RESULT FAIL")
        return 1
    print("E2E_RESULT PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
