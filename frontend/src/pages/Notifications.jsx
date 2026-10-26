import {useLanguage} from "../language";
import {api,listAll,date} from "../services/api";
import {useResource,ResourceState} from "../services/useResource";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, ChevronRight, Clock3 } from "lucide-react";

export default function Notifications({staff=false}) {
 const {t}=useLanguage();
  const resource=useResource(signal=>listAll("/notifications",signal),[]);
  const [message,setMessage]=useState("");
  const notifications=(resource.data || []).map(n=>({...n,read:n.is_read,time:date(n.created_at),path:n.complaint_id?`${staff?"/authority/complaints":"/my-complaints"}/${n.complaint_id}`:null}));
  const unreadCount=notifications.filter(n=>!n.read).length;
  const mutate=async path=>{try{await api(path,{method:"PATCH"});window.dispatchEvent(new Event("notifications-updated"));resource.reload();}catch(e){setMessage(e.message);}};
  const markAllRead=()=>mutate("/notifications/read-all");
  const markRead=id=>mutate(`/notifications/${id}/read`);

  return (
    <main className="mx-auto min-h-[70vh] max-w-[1100px] px-5 py-8 md:px-8">
      <ResourceState resource={resource}/>{message && <p role="alert">{message}</p>}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange-700">{t("Citizen Updates")}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("Notifications")}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("Updates about your complaints and verification requests will appear here.")}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-default disabled:opacity-50"
        >
          <CheckCheck size={16} />
          {t("Mark all as read")}
        </button>
      </div>

      <section aria-label="Notification list" className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        {!resource.loading && !resource.error && notifications.length === 0 ? (
          <div>
            <p className="text-2xl font-semibold text-slate-900">{t("No notifications yet")}</p>
            <p className="mt-3 text-sm text-slate-600">
              {t("Updates about your complaints and verification requests will appear here.")}
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            {notifications.map((notification) => (
              <article key={notification.id} className={`flex items-start gap-4 rounded-lg border border-slate-100 p-4 ${notification.read ? "" : "bg-orange-50/50"}`}>
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${notification.read ? "bg-slate-100 text-slate-600" : "bg-orange-100 text-orange-700"}`}>
                  {notification.read ? <Check size={18} /> : <Bell size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">{notification.title}</h2>
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-orange-600" aria-label="Unread" />}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock3 size={13} />
                    {notification.time}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Link to={notification.path || (staff?"/authority/dashboard":"/my-complaints")} onClick={() => markRead(notification.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-900">
                    {t("View details")}
                    <ChevronRight size={14} />
                  </Link>
                  {!notification.read && (
                    <button type="button" onClick={() => markRead(notification.id)} className="text-xs text-slate-500 hover:text-slate-800">{t("Mark read")}</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
