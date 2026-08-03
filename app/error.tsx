"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="fatal-state">
      <section>
        <h1>Não foi possível abrir o dashboard</h1>
        <p>O erro foi isolado. Tente carregar a página novamente.</p>
        <button onClick={reset}>Tentar novamente</button>
      </section>
    </main>
  );
}
