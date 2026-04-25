import type { Metadata } from "next";
import { getGroupsDirectoryData } from "@/lib/queries";
import { requireAuthUser } from "@/lib/session";
import { GroupsDirectory } from "@/components/groups-directory";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mashi - My Groups",
};

export default async function GroupsPage() {
  const user = await requireAuthUser();
  const groups = await getGroupsDirectoryData(user._id.toString());

  return <GroupsDirectory groups={groups} />;
}
