import ScreenClient from "./ScreenClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export default async function Page({ params }: Props) {
  const { code } = await params;
  return <ScreenClient code={code.toUpperCase()} />;
}
