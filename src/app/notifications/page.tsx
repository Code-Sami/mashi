import Link from "next/link";
import { markAllNotificationsReadAction, markNotificationReadAction, openNotificationAction } from "@/app/actions";
import { getNotificationInbox } from "@/lib/notifications";
import { requireAuthUser } from "@/lib/session";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function notificationLabel(item: Awaited<ReturnType<typeof getNotificationInbox>>[number]) {
  switch (item.type) {
    case "market_tagged":
      return `${item.actorName || "Someone"} tagged you in ${item.marketQuestion || "a market"}`;
    case "umpire_assigned":
      return `${item.actorName || "Someone"} assigned you as umpire for ${item.marketQuestion || "a market"}`;
    case "umpire_market_expired":
      return `Your umpire market expired: ${item.marketQuestion || "a market"}`;
    case "market_bet_resolved":
      return `${item.marketQuestion || "A market"} was resolved (${String(item.payload?.outcome || "").toUpperCase()})`;
    case "group_join_request_submitted":
      return `${item.actorName || "Someone"} requested to join ${item.groupName || "your group"}`;
    case "group_join_request_approved":
      return `Your request to join ${item.groupName || "this group"} was approved`;
    default:
      return "New activity";
  }
}

function notificationHref(item: Awaited<ReturnType<typeof getNotificationInbox>>[number]) {
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
                    <p className="text-sm font-medium">{notificationLabel(item)}</p>
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
