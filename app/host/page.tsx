import { requireFacilitatorPage } from "@/lib/auth/require-facilitator";
import HostLanding from "./HostLanding";

export const dynamic = "force-dynamic";

export default async function HostPage() {
  await requireFacilitatorPage();
  return <HostLanding />;
}
