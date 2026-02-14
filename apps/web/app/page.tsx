import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 40 }}>
      <Link href="/fixtures/1001">Go to Live Fixture 1001</Link>
    </main>
  );
}
