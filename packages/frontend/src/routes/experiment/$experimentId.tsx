import { createFileRoute } from '@tanstack/react-router'
import ExperimentDetails from '../../pages/ExperimentDetails'

export const Route = createFileRoute('/experiment/$experimentId')({
  component: ExperimentDetails
})