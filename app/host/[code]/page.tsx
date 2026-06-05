import HostClient from "./HostClient";

type Props = { params: Promise<{ code: string }> };

export default async function Page({ params }: Props) {
  const { code } = await params;
  return <HostClient code={code.toUpperCase()} />;
}
