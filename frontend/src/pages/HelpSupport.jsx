import {api} from "../services/api";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, Languages, MapPin, MessageCircle, Mic, Send, X } from "lucide-react";
import LocationPicker from "../components/common/LocationPicker";

const chatbotLanguages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
];
const translationProviderAvailable = false;

export default function HelpSupport() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [location, setLocation] = useState(null);
  const [showLocation, setShowLocation] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [responseLanguage, setResponseLanguage] = useState("en");
  const imageInput = useRef(null);
  const previewUrls = useRef([]);
  const effectiveResponseLanguage = translationProviderAvailable ? responseLanguage : "en";

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const updateText = (value) => {
    setText(value);
    if (value.trim()) setDetectedLanguage(/[\u0900-\u097F]/.test(value) ? "hi" : "en");
  };

  const updateLanguage = (event) => {
    const language = event.target.value;
    setSelectedLanguage(language);
    setResponseLanguage(language);
    setNotice(`${chatbotLanguages.find((item) => item.code === language)?.label} selected. Translation is unavailable; the assistant stays in English until a translation service is connected.`);
  };

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setNotice("Choose an image up to 10 MB.");
      event.target.value = "";
      return;
    }
    const preview = URL.createObjectURL(file);
    previewUrls.current.push(preview);
    setImage(file);
    setImagePreview(preview);
    setNotice("");
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    previewUrls.current = previewUrls.current.filter((url) => url !== imagePreview);
    setImage(null);
    setImagePreview("");
    if (imageInput.current) imageInput.current.value = "";
  };

  async function send(event) {
    event.preventDefault();
    if (!text.trim() && !image) {
      setNotice("Enter a message or attach an image.");
      return;
    }
    const entry = { text: text.trim(), image: image?.name, imagePreview, location, detectedLanguage, responseLanguage, effectiveResponseLanguage };
    setMessages((current) => [...current, entry]);
    setText("");
    setImage(null);
    setImagePreview("");
    setLoading(true);
    try {
      if(entry.image){setDraft({...entry,file:image});setNotice("Image saved as a local draft. Review in Report Issue; ML image classification is pending.");}
      else {const result=await api("/chatbot/message",{method:"POST",body:{message:entry.text}});setMessages(current=>[...current,{text:result.answer,effectiveResponseLanguage:"en",responseLanguage:"en",detectedLanguage:"en"}]);setDraft({...entry,file:image});setNotice("");}
    } catch(error){setNotice(error.message);} finally {setLoading(false);}
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <header className="mb-6 rounded-xl bg-[#102943] px-6 py-7 text-white sm:px-9">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-300">Citizen assistance</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Help &amp; Support</h1>
        <p className="mt-2 text-sm text-slate-300">Prepare a complaint draft or review guidance for reporting and follow-up.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(250px,0.85fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-3 bg-[#102943] p-5 text-white">
            <MessageCircle className="text-orange-400" />
            <div>
              <h2 className="font-bold">NagrikSetu Assistant</h2>
              <p className="text-xs text-slate-300">Guidance and draft support</p>
            </div>
          </header>

          <div className="flex flex-wrap gap-2 p-4">
            {["How do I report?", "Verify or reopen a resolution", "Escalate the same report"].map((item) => (
              <button key={item} type="button" onClick={() => updateText(item)} className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:border-orange-400">
                {item}
              </button>
            ))}
            <Link to="/track-complaint" className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-700">Complaint status</Link>
          </div>

          <div aria-live="polite" className="max-h-80 min-h-40 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 && <p className="text-sm text-slate-600">Tell us about the issue, and we will help you prepare a draft.</p>}
            {messages.map((entry, index) => (
              <article key={`${entry.image || "message"}-${index}`} className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
                <p className="whitespace-pre-wrap break-words">{entry.text}</p>
                {entry.imagePreview && <img src={entry.imagePreview} alt="Attached evidence preview" className="mt-2 max-h-40 max-w-full rounded-md object-contain" />}
                {entry.location && <p className="mt-2 text-xs text-slate-600">Incident location attached</p>}
                <p className="mt-2 text-[10px] text-slate-500">
                  Detected: {entry.detectedLanguage === "hi" ? "हिन्दी" : "English"} · Requested: {entry.responseLanguage === "hi" ? "हिन्दी" : "English"} · Active: {entry.effectiveResponseLanguage === "hi" ? "हिन्दी" : "English"}
                </p>
              </article>
            ))}
            {loading && <p role="status" className="text-sm text-slate-500">Preparing draft...</p>}
          </div>

          <form onSubmit={send} className="p-4">
            {imagePreview && (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <img src={imagePreview} alt="Selected evidence" className="h-16 w-16 rounded object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{image?.name}</span>
                <button type="button" onClick={() => imageInput.current?.click()} aria-label="Replace image" title="Replace image" className="rounded-md p-2 text-slate-600 hover:bg-white"><ImagePlus size={17} /></button>
                <button type="button" onClick={removeImage} aria-label="Remove image" title="Remove image" className="rounded-md p-2 text-slate-600 hover:bg-white"><X size={17} /></button>
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <span>Detected: <strong>{detectedLanguage === "hi" ? "हिन्दी" : "English"}</strong></span>
              <span>Response language: <strong>{responseLanguage === "hi" ? "हिन्दी" : "English"}</strong></span>
              <span className="text-amber-800">Translation provider unavailable; fallback remains English.</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-orange-400 sm:gap-2">
              <button type="button" aria-label="Voice input" title="Voice input" onClick={() => setNotice("Voice transcription is not connected yet.")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Mic size={18} /></button>
              <button type="button" aria-label={image ? "Replace image" : "Attach image"} title={image ? "Replace image" : "Attach image"} onClick={() => imageInput.current?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><ImagePlus size={18} /></button>
              <input ref={imageInput} type="file" accept="image/*" onChange={selectImage} className="sr-only" aria-label="Choose an image" />
              <button type="button" aria-label="Add location" title="Add location" onClick={() => setShowLocation((open) => !open)} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${showLocation ? "bg-orange-50 text-orange-700" : "text-slate-600 hover:bg-slate-100"}`}><MapPin size={18} /></button>
              <label className="flex shrink-0 items-center gap-1 text-slate-600" title="Response language">
                <Languages size={16} />
                <select aria-label="Chatbot response language" value={selectedLanguage} onChange={updateLanguage} className="max-w-20 border-0 bg-transparent py-2 text-xs outline-none sm:max-w-24">
                  {chatbotLanguages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                </select>
              </label>
              <input aria-label="Chat message" value={text} onChange={(event) => updateText(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none" placeholder="Write a message..." />
              <button disabled={loading} aria-label="Send message" title="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"><Send size={17} /></button>
            </div>

            {showLocation && <div className="mt-3"><LocationPicker value={location} onChange={setLocation} /></div>}
            <p role="status" className="mt-2 min-h-4 text-xs text-amber-800">{notice}</p>
          </form>

          {draft && (
            <section className="m-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <h3 className="font-bold">Complaint draft</h3>
              <p className="my-3 whitespace-pre-wrap break-words text-sm">{draft.text || "Image evidence draft"}</p>
              <p className="text-xs">{draft.image || "No image"} · {draft.location ? "Location attached" : "Location needed"}</p>
              <p className="my-3 text-xs">Review category, location, and description in the report form before final submission.</p>
              <Link to="/report-issue" state={{ draft }} className="text-sm font-semibold text-orange-700 underline">Review in Report Issue</Link>
              <button type="button" onClick={() => setDraft(null)} className="ml-3 text-xs underline">Discard</button>
            </section>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Email support</h2>
            <a href="mailto:nagriksetuprashasti@gmail.com" className="mt-3 block break-all text-sm text-orange-700">nagriksetuprashasti@gmail.com</a>
          </section>

          <section id="faq" className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Frequently asked questions</h2>
            {[
              ["What should I upload?", "Clear evidence taken safely. Avoid faces, documents, and private information."],
              ["What if the issue remains?", "Escalate or reopen the same report with updated evidence instead of filing a duplicate complaint."],
              ["Can I use voice?", "Voice input is prepared for future integration. Text input is available in this front-end preview."]
            ].map(([question, answer]) => (
              <details key={question} className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold">{question}</summary>
                <p className="mt-2 leading-6 text-slate-600">{answer}</p>
              </details>
            ))}
            <Link to="/resources" className="mt-4 block text-sm text-orange-700 underline">Reporting resources</Link>
          </section>
        </aside>
      </div>
    </main>
  );
}