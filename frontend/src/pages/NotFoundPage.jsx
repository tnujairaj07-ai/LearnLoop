import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-sunken px-4 text-center">
      <p className="font-serif text-3xl font-semibold text-ink">Page not found</p>
      <p className="text-sm text-ink-faint">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link to="/" className="btn btn-primary mt-2">
        Back to dashboard
      </Link>
    </div>
  )
}
