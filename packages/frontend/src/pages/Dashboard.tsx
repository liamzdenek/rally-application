import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useExperiments } from '../hooks/useApi'
import Card from '../components/Card'
import Button from '../components/Button'
import Loading from '../components/Loading'
import styles from './Dashboard.module.css'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { data: apiResponse, loading, error, refetch } = useExperiments()
  const experiments = apiResponse?.data?.experiments || []
  
  // Sort experiments by creation date (most recent first)
  const sortedExperiments = [...experiments].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (loading) {
    return <Loading message="Loading experiments..." />
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.error}>
          <h2>Error Loading Experiments</h2>
          <p>{error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>RallyUXR Dashboard</h1>
        <Link to="/create">
          <Button variant="primary">Create New Experiment</Button>
        </Link>
      </div>

      <div className={styles.stats}>
        <Card title="Total Experiments">
          <div className={styles.statValue}>{sortedExperiments?.length || 0}</div>
        </Card>
        <Card title="Running Experiments">
          <div className={styles.statValue}>
            {sortedExperiments?.filter((exp: any) => exp.status === 'running').length || 0}
          </div>
        </Card>
        <Card title="Completed Experiments">
          <div className={styles.statValue}>
            {sortedExperiments?.filter((exp: any) => exp.status === 'complete').length || 0}
          </div>
        </Card>
      </div>

      <div className={styles.experiments}>
        <h2>Recent Experiments</h2>
        {sortedExperiments && sortedExperiments.length > 0 ? (
          <div className={styles.experimentGrid}>
            {sortedExperiments.map((experiment: any) => (
              <Card
                key={experiment.id}
                title={experiment.name}
                onClick={() => {
                  navigate({ to: '/experiment/$experimentId', params: { experimentId: experiment.id } })
                }}
                variant={experiment.status === 'running' ? 'highlighted' : 'default'}
              >
                <p><strong>Status:</strong> {experiment.status}</p>
                <p><strong>Created:</strong> {new Date(experiment.createdAt).toLocaleDateString()}</p>
                <p><strong>Type:</strong> {experiment.type}</p>
                {experiment.description && (
                  <p><strong>Description:</strong> {experiment.description}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No experiments found. Create your first experiment to get started!</p>
            <Link to="/create">
              <Button variant="primary">Create Experiment</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard