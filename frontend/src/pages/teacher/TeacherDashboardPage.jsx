import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { status, data, error, refetch, isEmpty } = useApi(
    () => classesService.listForTeacher(user?.id),
    [user?.id]
  )

  return (
    <>
      <Topbar title="Dashboard" breadcrumb="Teacher" />
      <main className="flex-1 space-y-6 p-6">
        <div>
          <h2 className="font-serif text-xl font-semibold text-ink">Your classes</h2>
          <p className="text-sm text-ink-faint">Pick a class to see its mastery heatmap and interventions.</p>
        </div>

        {status === 'loading' && <LoadingState label="Loading your classes" rows={4} />}
        {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}
        {isEmpty && (
          <EmptyState
            title="No classes assigned yet"
            description="Once an admin assigns you to a class and subject, it will appear here."
          />
        )}

        {status === 'success' && !isEmpty && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                className="panel panel-accent-teal p-5 text-left transition-shadow hover:shadow-md"
              >
                <p className="text-xs text-ink-faint">{cls.subjectName || cls.grade || 'Class 9'}</p>
                <h3 className="mt-0.5 text-base font-semibold text-ink">{cls.name}</h3>
                <dl className="mt-4 flex gap-6">
                  <div>
                    <dt className="text-xs text-ink-faint">Students</dt>
                    <dd className="text-lg font-semibold tabular-nums text-ink">{cls.studentCount ?? cls.student_count ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-faint">Average mastery</dt>
                    <dd className="text-lg font-semibold tabular-nums text-ink">
                      {cls.averageMastery != null ? `${cls.averageMastery}%` : '—'}
                    </dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
