import { getGroupsDirectoryData } from "@/lib/queries";
import { requireAuthUser } from "@/lib/session";
import { GroupsDirectory } from "@/components/groups-directory";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await requireAuthUser();
  const groups = await getGroupsDirectoryData(user._id.toString());

  return <GroupsDirectory groups={groups} />;
}
