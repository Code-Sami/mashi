import type { Metadata } from "next";
import { markAllNotificationsReadAction, markNotificationReadAction, openNotificationAction } from "@/app/actions";
import { getNotificationInbox } from "@/lib/notifications";
import { requireAuthUser } from "@/lib/session";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mashi - Notifications",
};

type NotificationInboxItem = Awaited<ReturnType<typeof getNotificationInbox>>[number];

function NotificationMessage({ item }: { item: NotificationInboxItem }) {
  const p = "text-sm font-medium";

  switch (item.type) {
    case "market_tagged":
      return <p className={p}>{`${item.actorName || "Someone"} tagged you in ${item.marketQuestion || "a market"}`}</p>;
    case "umpire_assigned":
      return (
        <p className={p}>
          {`${item.actorName || "Someone"} made you umpire for ${item.marketQuestion || "a market"}. Open the market and resolve it when the outcome is known.`}
        </p>
      );
    case "umpire_market_expired":
      return (
        <p className={p}>
          {`Deadline passed on ${item.marketQuestion || "a market"} — you are the umpire. Open the market and resolve it now!`}
        </p>
      );
    case "market_bet_resolved": {
      const raw = String(item.payload?.outcome || "").toLowerCase();
      const side = raw === "yes" || raw === "no" ? raw : null;
      return (
        <p className={p}>
          <span>{item.marketQuestion || "A market"} was resolved </span>
          {side ? (
            <span
              className={`inline-block rounded-md px-2 py-0.5 align-baseline text-xs font-bold uppercase tracking-wide ${side === "yes" ? "bg-yes-bg text-yes" : "bg-no-bg text-no"}`}
            >
              {side === "yes" ? "YES" : "NO"}
            </span>
          ) : (
            <span className="text-foreground-secondary">(outcome unknown)</span>
          )}
        </p>
      );
    }
    case "group_join_request_submitted":
      return <p className={p}>{`${item.actorName || "Someone"} requested to join ${item.groupName || "your group"}`}</p>;
    case "group_join_request_approved":
      return <p className={p}>{`Your request to join ${item.groupName || "this group"} was approved`}</p>;
    case "group_join_request_denied":
      return <p className={p}>{`Your request to join ${item.groupName || "this group"} was denied`}</p>;
    default:
      return <p className={p}>New activity</p>;
  }
}

function notificationHref(item: NotificationInboxItem) {
  if (item.marketId) return `/markets/${item.marketId}`;
  if (item.groupId) return `/groups/${item.groupId}`;
  return "/dashboard";
}

export default async function NotificationsPage() {
  const user = await requireAuthUser();
  const notifications = await getNotificationInbox(user._id.toString());
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Notifications</h1>
            <p className="text-sm text-foreground-secondary">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-background-secondary">
                Mark all read
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--card-shadow)]">
        <div className="grid gap-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-foreground-tertiary">No notifications yet.</p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 ${item.read ? "border-border-light bg-white" : "border-brand/30 bg-brand/5"}`}
              >
                <form action={openNotificationAction}>
                  <input type="hidden" name="notificationId" value={item.id} />
                  <input type="hidden" name="target" value={notificationHref(item)} />
                  <button type="submit" className="block w-full cursor-pointer rounded-md text-left transition hover:opacity-90">
                    <NotificationMessage item={item} />
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-foreground-tertiary">
                      {item.createdAt ? <span>{relativeTime(item.createdAt)}</span> : null}
                    </div>
                  </button>
                </form>
                {!item.read ? (
                  <form action={markNotificationReadAction} className="mt-2">
                    <input type="hidden" name="notificationId" value={item.id} />
                    <button className="rounded-md border border-border px-2 py-1 text-xs font-medium transition hover:bg-background-secondary">
                      Mark read
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
