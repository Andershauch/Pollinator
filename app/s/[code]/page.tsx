import ParticipantClient from "./ParticipantClient";

type Props = { params: Promise<{ code: string }> };

export default async function Page({ params }: Props) {
  const { code } = await params;
  return <ParticipantClient code={code.toUpperCase()} />;
}
