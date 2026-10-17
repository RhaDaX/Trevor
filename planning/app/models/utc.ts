import { DateTime } from 'luxon'

/**
 * Lucid formate un DateTime dans son propre fuseau : une date « Europe/Paris »
 * serait stockée avec 1 ou 2 h d'écart. Toutes les colonnes passent en UTC.
 */
export const utc = {
  prepare: (value: unknown) =>
    DateTime.isDateTime(value)
      ? value.isValid
        ? value.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
        : (() => {
            throw new Error(`date invalide : ${value.invalidReason}`)
          })()
      : value,
}
