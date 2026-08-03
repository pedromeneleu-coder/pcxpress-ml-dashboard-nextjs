import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fatal-state">
      <section>
        <h1>Página não encontrada</h1>
        <p>Volte para a página inicial do dashboard.</p>
        <Link href="/">Abrir dashboard</Link>
      </section>
    </main>
  );
}
