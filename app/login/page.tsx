import { LoginScreen } from "@/components/auth/LoginScreen";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/onboarding";

  return <LoginScreen nextPath={next} />;
}
