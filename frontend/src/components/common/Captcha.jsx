import { useEffect, useRef, useState } from "react";

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export default function Captcha({ onToken }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("waiting");
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return undefined;
    let widgetId;
    let active = true;
    const renderWidget = () => {
      if (!active || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => { onToken(token); setStatus("complete"); },
        "expired-callback": () => { onToken(""); setStatus("expired"); },
        "error-callback": () => { onToken(""); setStatus("error"); },
      });
      setStatus("ready");
    };
    let script = document.querySelector(`script[src="${scriptUrl}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderWidget);
    renderWidget();
    return () => {
      active = false;
      script.removeEventListener("load", renderWidget);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, onToken]);

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label="CAPTCHA verification">
      <p className="text-xs font-semibold text-slate-800">CAPTCHA</p>
      {siteKey ? <>
        <div ref={containerRef} className="mt-2 min-h-16" />
        <p className="text-[11px] text-slate-500">{status === "complete" ? "Challenge complete; server verification is still required." : status === "error" || status === "expired" ? "Challenge needs to be completed again." : "Complete the challenge to continue."}</p>
      </> : <p className="mt-1 text-xs text-amber-800">Development placeholder: Turnstile is not configured and has not been verified.</p>}
    </section>
  );
}