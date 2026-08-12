import ClientProviders from "@/components/ClientProviders";
import ModernWorkspace from "@/components/ModernWorkspace";

export default function Home() {
  return (
    <ClientProviders>
      <ModernWorkspace />
    </ClientProviders>
  );
}

export function HomeInner() {
  return <ModernWorkspace />;
}
