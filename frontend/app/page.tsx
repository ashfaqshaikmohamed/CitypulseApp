// FILE: frontend/app/page.tsx
// ROLE: High fidelity project placeholder matching the custom dark navy design system rules.

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ background: 'var(--navy)' }}>
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full border-t-2 border-r-2 border-[var(--blue4)] animate-spin"></div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight"
          style={{ fontFamily: 'var(--font-syne)', color: 'var(--offwhite)' }}>
          City<span style={{ color: 'var(--blue4)' }}>Pulse</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--offwhite2)' }}>
          Reconciling municipal data models, analyzing camera visions, and indexing location segments.
        </p>
      </div>
    </main>
  );
}
