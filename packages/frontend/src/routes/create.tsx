import { createFileRoute } from '@tanstack/react-router'
import CreateExperiment from '../pages/CreateExperiment'

export const Route = createFileRoute('/create')({
  component: CreateExperiment
})