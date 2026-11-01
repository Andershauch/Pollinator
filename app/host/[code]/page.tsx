import HostClient from "./HostClient";
import { requireFacilitatorPage } from "@/lib/auth/require-facilitator";

type Props = { params: Promise<{ code: string }> };

export default async function Page({ params }: Props) {
  await requireFacilitatorPage();
  const { code } = await params;
  return <HostClient code={code.toUpperCase()} />;
}
