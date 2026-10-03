import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, ChevronRight, Clock3 } from "lucide-react";
import { notifications as initialNotifications } from "../data/notificationsData";

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAllRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );
  };

  const markRead = (id) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  return (
    <main className="mx-auto min-h-[70vh] max-w-[1100px] px-5 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Citizen Updates</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-2 text-sm text-slate-600">
            Complaint progress, verification requests, and service updates.
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-default disabled:opacity-50"
        >
          <CheckCheck size={16} />
          Mark all as read
        </button>
      </div>

      <section aria-label="Notification list" className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`flex items-start gap-4 p-4 sm:p-5 ${notification.read ? "" : "bg-orange-50/50"}`}
          >
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
                <span className="px-1">·</span>
                Complaint {notification.id}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Link
                to={notification.path}
                onClick={() => markRead(notification.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-900"
              >
                View details
                <ChevronRight size={14} />
              </Link>
              {!notification.read && (
                <button
                  type="button"
                  onClick={() => markRead(notification.id)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Mark read
                </button>
              )}
            </div>
          </article>
        ))}
        {notifications.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">You’re all caught up.</p>
        )}
      </section>
    </main>
  );
}