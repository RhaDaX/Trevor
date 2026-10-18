import ErrorPage, { type ErrorProps } from '~/components/error_page'

export default function ServerError({ error }: { error?: ErrorProps }) {
  return <ErrorPage title="Quelque chose s’est mal passé" error={error} />
}
