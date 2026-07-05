import { Card } from "@/components/ui/Card";

export function ComingSoonStub({ title }: { title: string }) {
  return (
    <Card>
      <h1 className="font-heading text-lg font-bold text-text-primary">{title}</h1>
      <p className="mt-2 text-sm text-text-muted">
        This screen is scaffolded but not yet built — coming in a later build step.
      </p>
    </Card>
  );
}
