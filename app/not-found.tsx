import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fatal-state">
      <section>
        <h1>Pagina nao encontrada</h1>
        <p>Volte para a pagina inicial do dashboard.</p>
        <Link href="/">Abrir dashboard</Link>
      </section>
    </main>
  );
}
