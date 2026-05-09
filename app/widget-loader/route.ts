import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const host =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const js = `
;(function(){
  var script = document.currentScript || (function(){
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  if (!script) return;

  var slug  = script.getAttribute('data-aistaffer');
  if (!slug) { console.warn('[aistaffer] missing data-aistaffer attr'); return; }
  var color = script.getAttribute('data-color') || '#0070c4';
  var host  = ${JSON.stringify(host)};

  var btn = document.createElement('button');
  btn.setAttribute('aria-label', 'Open chat');
  btn.style.cssText = [
    'position:fixed','right:20px','bottom:20px','z-index:2147483600',
    'width:56px','height:56px','border-radius:9999px','border:none',
    'background:'+color,'color:#fff','box-shadow:0 8px 20px rgba(0,0,0,0.18)',
    'cursor:pointer','font:600 14px system-ui,sans-serif'
  ].join(';');
  btn.innerHTML = '✨';

  var frame = document.createElement('iframe');
  frame.title = 'AI assistant';
  frame.src = host + '/widget/' + encodeURIComponent(slug) + '?color=' + encodeURIComponent(color);
  frame.style.cssText = [
    'position:fixed','right:20px','bottom:88px','z-index:2147483600',
    'width:380px','height:560px','max-width:calc(100vw - 40px)','max-height:calc(100vh - 120px)',
    'border:none','border-radius:14px','box-shadow:0 16px 40px rgba(0,0,0,0.20)',
    'background:#fff','display:none'
  ].join(';');

  var open = false;
  function toggle(){
    open = !open;
    frame.style.display = open ? 'block' : 'none';
    btn.innerHTML = open ? '✕' : '✨';
  }

  btn.addEventListener('click', toggle);

  function mount(){
    document.body.appendChild(frame);
    document.body.appendChild(btn);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
