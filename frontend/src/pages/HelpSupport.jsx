import React, { useState } from "react";

import {
  Headphones,
  PhoneCall,
  Mail,
  ArrowRight,
  Send,
  Mic,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  Search,
  MessageCircle,
  ChevronRight,
  LockKeyhole,
} from "lucide-react";

import { helpSupportData } from "../data/helpSupportData";


const data = helpSupportData;


function HelpSupport() {

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState(
    data.assistant.messages
  );

  const [trackingId, setTrackingId] = useState("");


  // ==========================================================
  // SEND CHAT MESSAGE
  // ==========================================================

  const handleSendMessage = () => {

    const trimmedMessage = message.trim();

    if (!trimmedMessage) return;


    const newMessage = {
      id: Date.now(),
      type: "user",
      text: trimmedMessage,
      time: "Just now",
    };


    setMessages((prev) => [
      ...prev,
      newMessage,
    ]);

    setMessage("");


    // Temporary assistant response
    setTimeout(() => {

      const assistantReply = {
        id: Date.now() + 1,
        type: "assistant",
        text:
          "Thanks for your query. I can help you with reporting issues, tracking complaints, selecting categories, and understanding the civic grievance process.",
        time: "Just now",
      };

      setMessages((prev) => [
        ...prev,
        assistantReply,
      ]);

    }, 600);
  };


  // ==========================================================
  // ENTER KEY
  // ==========================================================

  const handleKeyDown = (e) => {

    if (e.key === "Enter" && !e.shiftKey) {

      e.preventDefault();

      handleSendMessage();
    }
  };


  // ==========================================================
  // QUICK PROMPT
  // ==========================================================

  const handleQuickPrompt = (prompt) => {

    setMessage(prompt);
  };


  // ==========================================================
  // TRACK COMPLAINT
  // ==========================================================

  const handleTrackComplaint = () => {

    if (!trackingId.trim()) return;

    window.location.href =
      `/track-complaint/${trackingId.trim()}`;
  };


  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#101828]">


      {/* ======================================================
          HERO SECTION
      ====================================================== */}

      <section className="px-5 pb-6 pt-8 sm:px-8 lg:px-12">

        <div className="mx-auto max-w-5xl text-center">

          {/* Badge */}

          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#ffebe4] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#b83205]">

            <Headphones size={13} />

            {data.hero.badge}

          </div>


          {/* Heading */}

          <h1 className="text-3xl font-bold tracking-tight text-[#0d1f35] sm:text-4xl lg:text-[40px]">

            {data.hero.title}

          </h1>


          {/* Description */}

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base">

            {data.hero.description}

          </p>

        </div>

      </section>


      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[1.8fr_0.9fr] lg:px-8">


        {/* ====================================================
            CHAT ASSISTANT
        ==================================================== */}

        <section className="relative overflow-hidden rounded-xl bg-white shadow-lg">


          {/* Top orange/green line */}

          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#ff6427] via-[#172b44] to-[#20b981]" />


          {/* Assistant Header */}

          <div className="border-b border-gray-100 bg-[#f4f6f8] px-5 pb-4 pt-6">

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                {/* Avatar */}

                <div className="relative">

                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#102943] text-[#ff6427] shadow-sm">

                    <MessageCircle size={22} />

                  </div>


                  <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />

                </div>


                {/* Name */}

                <div>

                  <div className="flex flex-wrap items-center gap-2">

                    <h2 className="text-base font-semibold text-gray-900">

                      {data.assistant.name}

                    </h2>


                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-emerald-600">

                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                      {data.assistant.status}

                    </span>

                  </div>


                  <p className="mt-0.5 text-[10px] text-gray-600">

                    {data.assistant.intro}

                  </p>

                </div>

              </div>


              <button
                type="button"
                className="rounded-full p-2 text-gray-700 transition hover:bg-gray-200"
              >
                <RotateCcw size={17} />
              </button>

            </div>


            {/* Quick Prompts */}

            <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">

              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-gray-700">

                ⚡ Quick Prompts:

              </span>


              {data.assistant.quickPrompts.map(
                (prompt) => (

                  <button
                    key={prompt}
                    onClick={() =>
                      handleQuickPrompt(prompt)
                    }
                    className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-2 text-[10px] text-gray-700 transition hover:border-[#ff6427] hover:text-[#b83205]"
                  >
                    {prompt}
                  </button>

                )
              )}

            </div>

          </div>


          {/* ==================================================
              CHAT MESSAGES
          ================================================== */}

          <div className="h-[390px] overflow-y-auto bg-[#fbfcfd] px-5 py-5">

            <div className="space-y-5">

              {messages.map((item) => (

                <div
                  key={item.id}
                  className={`flex ${
                    item.type === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  <div
                    className={`flex max-w-[88%] gap-3 ${
                      item.type === "user"
                        ? "flex-row-reverse"
                        : "flex-row"
                    }`}
                  >

                    {/* Avatar */}

                    <div
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        item.type === "user"
                          ? "bg-[#102943] text-white"
                          : "bg-[#102943] text-[#ff6427]"
                      }`}
                    >

                      {item.type === "user" ? (
                        <span className="text-[9px] font-bold">
                          RV
                        </span>
                      ) : (
                        <MessageCircle size={15} />
                      )}

                    </div>


                    {/* Message */}

                    <div>

                      <div
                        className={`rounded-xl px-4 py-3 text-xs leading-5 ${
                          item.type === "user"
                            ? "rounded-tr-sm bg-[#102943] text-white"
                            : "rounded-tl-sm border border-gray-100 bg-white text-gray-800 shadow-sm"
                        }`}
                      >

                        {item.text}


                        {/* Steps */}

                        {item.steps && (

                          <div className="mt-3 space-y-2 rounded-lg bg-[#f0f2f4] p-3">

                            {item.steps.map(
                              (step) => (

                                <div
                                  key={step.number}
                                  className="flex gap-2 text-[10px] leading-5 text-gray-700"
                                >

                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ffddd0] font-bold text-[#b83205]">

                                    {step.number}

                                  </span>

                                  <span>
                                    {step.text}
                                  </span>

                                </div>

                              )
                            )}

                          </div>

                        )}

                      </div>


                      {/* Time */}

                      <p
                        className={`mt-1 px-1 text-[9px] text-gray-500 ${
                          item.type === "user"
                            ? "text-right"
                            : ""
                        }`}
                      >

                        {item.time}

                        {item.type ===
                          "assistant" &&
                          " • Automated Assistant"}

                        {item.type === "user" &&
                          " • You"}

                      </p>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>


          {/* ==================================================
              CHAT INPUT
          ================================================== */}

          <div className="border-t border-gray-100 bg-white p-3">

            <div className="flex items-center gap-2">

              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f2f4] text-gray-700 hover:bg-gray-200"
              >
                <Mic size={16} />
              </button>


              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f2f4] text-gray-700 hover:bg-gray-200"
              >
                <Paperclip size={16} />
              </button>


              <input
                type="text"
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="Type your question or issue description..."
                className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-[#f0f2f4] px-3 text-xs outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-[#ff6427]"
              />


              <button
                onClick={handleSendMessage}
                className="flex h-9 items-center gap-2 rounded-lg bg-[#ff6427] px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#e6531d]"
              >

                Send

                <Send size={14} />

              </button>

            </div>


            <div className="mt-2 flex items-center gap-1 text-[9px] text-gray-500">

              <LockKeyhole size={10} />

              Encrypted citizen communication session

            </div>

          </div>

        </section>


        {/* ====================================================
            RIGHT SIDEBAR
        ==================================================== */}

        <aside className="space-y-5">


          {/* ==================================================
              EMERGENCY HELPLINE
          ================================================== */}

          <section className="rounded-xl bg-white p-5 shadow-sm">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ffded5] text-[#b83205]">

                <PhoneCall size={18} />

              </div>


              <div>

                <h2 className="text-base font-semibold">
                  {data.emergency.title}
                </h2>

                <p className="mt-1 text-[10px] text-gray-600">
                  {data.emergency.description}
                </p>

              </div>

            </div>


            <div className="mt-4 rounded-lg bg-[#f0f2f4] p-4">

              <p className="text-[9px] font-bold tracking-wide text-gray-600">

                {data.emergency.label}

              </p>


              <div className="mt-1 flex items-center justify-between">

                <span className="text-2xl font-bold text-[#b83205]">

                  {data.emergency.number}

                </span>


                <a
                  href={`tel:${data.emergency.number}`}
                  className="flex items-center gap-1.5 rounded-lg bg-[#ff6427] px-3 py-2 text-[10px] font-semibold text-white"
                >

                  <PhoneCall size={13} />

                  Call Now

                </a>

              </div>

            </div>


            <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-700">

              <Mail size={14} />

              {data.emergency.emailLabel}

            </div>


            <a
              href={`mailto:${data.emergency.email}`}
              className="mt-2 block pl-6 text-[10px] font-medium text-[#ff6427]"
            >
              {data.emergency.email}
            </a>

          </section>


          {/* ==================================================
              DIRECT TRACKING
          ================================================== */}

          <section className="rounded-xl bg-white p-5 shadow-sm">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#183c70]">

                <Search size={18} />

              </div>


              <div>

                <h2 className="text-base font-semibold">
                  {data.directTracking.title}
                </h2>

                <p className="mt-1 text-[10px] text-gray-600">
                  {data.directTracking.description}
                </p>

              </div>

            </div>


            <label className="mt-5 block text-[9px] font-bold text-gray-700">

              {data.directTracking.label}

            </label>


            <div className="mt-2 flex gap-2">

              <input
                value={trackingId}
                onChange={(e) =>
                  setTrackingId(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTrackComplaint();
                  }
                }}
                placeholder={
                  data.directTracking.placeholder
                }
                className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-[#f0f2f4] px-3 text-[10px] outline-none focus:ring-2 focus:ring-[#102943]"
              />


              <button
                onClick={handleTrackComplaint}
                className="flex h-9 w-10 shrink-0 items-center justify-center rounded-lg bg-[#102943] text-white hover:bg-[#183c70]"
              >
                <ArrowRight size={16} />
              </button>

            </div>

          </section>


          {/* ==================================================
              TOP ASSISTANCE TOPICS
          ================================================== */}

          <section className="rounded-xl bg-white p-5 shadow-sm">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-base font-semibold">
                {data.topics.title}
              </h2>

              <span className="text-[9px] font-bold text-gray-600">
                {data.topics.faq}
              </span>

            </div>


            <div className="space-y-2">

              {data.topics.items.map((topic) => (

                <button
                  key={topic.id}
                  type="button"
                  className="group w-full rounded-lg bg-[#f0f2f4] p-3 text-left transition hover:bg-[#e8ebee]"
                >

                  <div className="flex items-center justify-between">

                    <h3 className="text-[10px] font-semibold text-gray-800">
                      {topic.title}
                    </h3>

                    <ChevronRight
                      size={13}
                      className="text-gray-600 transition group-hover:translate-x-1"
                    />

                  </div>


                  <p className="mt-1 text-[9px] leading-4 text-gray-600">
                    {topic.description}
                  </p>

                </button>

              ))}

            </div>

          </section>


          {/* ==================================================
              CIVIC INTEGRITY GUARANTEE
          ================================================== */}

          <section className="rounded-xl bg-[#102943] p-5 text-white shadow-sm">

            <div className="flex gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">

                <ShieldCheck size={18} />

              </div>


              <div>

                <h2 className="text-sm font-semibold">
                  {data.guarantee.title}
                </h2>

                <p className="mt-2 text-[10px] leading-5 text-slate-400">
                  {data.guarantee.description}
                </p>

              </div>

            </div>

          </section>

        </aside>

      </main>

    </div>
  );
}


export default HelpSupport;