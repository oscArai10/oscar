import { TokenFactoryClient } from "@/components/token-factory/TokenFactoryClient";

export default function TokenFactoryPage({
  searchParams,
}: {
  searchParams: { prompt?: string };
}) {
  return <TokenFactoryClient initialPrompt={searchParams.prompt} />;
}
