import { InvitationPage } from "@/components/invitation/invitation-page";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationPage token={token} />;
}