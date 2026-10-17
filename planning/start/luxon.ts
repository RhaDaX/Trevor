import { Settings } from 'luxon'

/**
 * Le serveur raisonne en UTC ; le fuseau de l'utilisateur n'intervient qu'à
 * la saisie et à l'affichage.
 */
Settings.defaultZone = 'utc'
