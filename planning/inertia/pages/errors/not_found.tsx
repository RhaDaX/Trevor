import ErrorPage, { type ErrorProps } from '~/components/error_page'

export default function NotFound({ error }: { error?: ErrorProps }) {
  return <ErrorPage title="Introuvable" error={{ status: 404, ...error }} />
}
