/**
 * Jeu de démonstration : une agence web, deux entreprises (A et B).
 * Les dates sont relatives au lancement du seed (jours, heures locales).
 */

export interface DemoClient {
  key: string
  company: 'a' | 'b'
  name: string
  email: string
  domain?: string
  phone?: string
}

/** Clients de l'entreprise A (agence web) puis B (hébergement / maintenance) */
export const DEMO_CLIENTS: DemoClient[] = [
  // --- A ---
  {
    key: 'dupont',
    company: 'a',
    name: 'Dupont BTP',
    email: 'jean@dupont-btp.fr',
    domain: 'dupont-btp.fr',
    phone: '01 42 18 55 20',
  },
  {
    key: 'garage-martin',
    company: 'a',
    name: 'Garage Martin',
    email: 'contact@garage-martin.fr',
    domain: 'garage-martin.fr',
    phone: '04 78 62 11 09',
  },
  {
    key: 'leroy',
    company: 'a',
    name: 'Cabinet Leroy Avocats',
    email: 'secretariat@leroy-avocats.fr',
    domain: 'leroy-avocats.fr',
  },
  {
    key: 'fleurs',
    company: 'a',
    name: 'Les Fleurs de Lise',
    email: 'lise@fleursdelise.fr',
    domain: 'fleursdelise.fr',
  },
  {
    key: 'optique',
    company: 'a',
    name: 'Optique Vision Plus',
    email: 'magasin@visionplus-optique.fr',
    domain: 'visionplus-optique.fr',
  },
  {
    key: 'kine',
    company: 'a',
    name: 'Kiné Santé Bastide',
    email: 'accueil@kine-bastide.fr',
    domain: 'kine-bastide.fr',
  },
  {
    key: 'menuiserie',
    company: 'a',
    name: 'Menuiserie Roux & Fils',
    email: 'atelier@roux-menuiserie.fr',
    domain: 'roux-menuiserie.fr',
  },
  {
    key: 'traiteur',
    company: 'a',
    name: 'Traiteur Saveurs du Sud',
    email: 'commandes@saveursdusud.fr',
    domain: 'saveursdusud.fr',
  },
  {
    key: 'notaire',
    company: 'a',
    name: 'Étude Notariale Fabre',
    email: 'office@fabre-notaires.fr',
    domain: 'fabre-notaires.fr',
  },
  {
    key: 'velo',
    company: 'a',
    name: 'Cycles Lambert',
    email: 'boutique@cycles-lambert.fr',
    domain: 'cycles-lambert.fr',
  },
  {
    key: 'coiffure',
    company: 'a',
    name: 'Salon Coiffure Émilie',
    email: 'emilie.coiffure@gmail.com',
  },
  {
    key: 'plombier',
    company: 'a',
    name: 'Plomberie Girard',
    email: 'girard.plomberie@orange.fr',
    phone: '06 12 45 78 90',
  },
  {
    key: 'yoga',
    company: 'a',
    name: 'Studio Yoga Lumière',
    email: 'hello@yoga-lumiere.fr',
    domain: 'yoga-lumiere.fr',
  },
  {
    key: 'vin',
    company: 'a',
    name: 'Domaine des Coteaux',
    email: 'cave@domaine-coteaux.fr',
    domain: 'domaine-coteaux.fr',
  },
  {
    key: 'archi',
    company: 'a',
    name: 'Atelier Archi Moreau',
    email: 'contact@moreau-architecte.fr',
    domain: 'moreau-architecte.fr',
  },
  {
    key: 'dentiste',
    company: 'a',
    name: 'Cabinet Dentaire du Parc',
    email: 'rdv@dentaire-du-parc.fr',
    domain: 'dentaire-du-parc.fr',
  },
  { key: 'ecole', company: 'a', name: 'Auto-École Prado', email: 'prado.autoecole@free.fr' },
  {
    key: 'bijoux',
    company: 'a',
    name: 'Bijouterie Chevalier',
    email: 'contact@bijouterie-chevalier.fr',
    domain: 'bijouterie-chevalier.fr',
  },
  {
    key: 'immo-a',
    company: 'a',
    name: 'Agence Immo Méditerranée',
    email: 'agence@immo-mediterranee.fr',
    domain: 'immo-mediterranee.fr',
  },
  { key: 'pressing', company: 'a', name: 'Pressing Éclat', email: 'pressing.eclat@laposte.net' },
  {
    key: 'cafe',
    company: 'a',
    name: 'Café des Arts',
    email: 'bonjour@cafedesarts.fr',
    domain: 'cafedesarts.fr',
  },
  {
    key: 'expert',
    company: 'a',
    name: 'Expertise Comptable Bertin',
    email: 'cabinet@bertin-expertise.fr',
    domain: 'bertin-expertise.fr',
  },
  {
    key: 'paysagiste',
    company: 'a',
    name: 'Jardins Verdier',
    email: 'contact@jardins-verdier.fr',
    domain: 'jardins-verdier.fr',
  },
  {
    key: 'photo',
    company: 'a',
    name: 'Studio Photo Clair-Obscur',
    email: 'studio@clair-obscur.photo',
    domain: 'clair-obscur.photo',
  },
  {
    key: 'librairie',
    company: 'a',
    name: 'Librairie La Page',
    email: 'lapage@librairie-lapage.fr',
    domain: 'librairie-lapage.fr',
  },
  {
    key: 'electricien',
    company: 'a',
    name: 'Élec Services Petit',
    email: 'petit.elec@gmail.com',
    phone: '06 98 76 54 32',
  },
  {
    key: 'veto',
    company: 'a',
    name: 'Clinique Vétérinaire des Pins',
    email: 'accueil@veto-des-pins.fr',
    domain: 'veto-des-pins.fr',
  },
  {
    key: 'hotel',
    company: 'a',
    name: 'Hôtel Le Belvédère',
    email: 'reception@hotel-belvedere.fr',
    domain: 'hotel-belvedere.fr',
  },
  {
    key: 'association',
    company: 'a',
    name: 'Association Les Amis du Port',
    email: 'bureau@amisduport.org',
    domain: 'amisduport.org',
  },
  {
    key: 'sport',
    company: 'a',
    name: 'Salle FitZone',
    email: 'contact@fitzone-club.fr',
    domain: 'fitzone-club.fr',
  },
  // --- B ---
  {
    key: 'boulangerie-martin',
    company: 'b',
    name: 'Boulangerie Martin',
    email: 'boulangerie.martin@orange.fr',
  },
  {
    key: 'horizon',
    company: 'b',
    name: 'Immo Horizon',
    email: 'agence@immo-horizon.fr',
    domain: 'immo-horizon.fr',
  },
  { key: 'pomme', company: 'b', name: 'Pomme & Co', email: 'bonjour@pomme.co', domain: 'pomme.co' },
  {
    key: 'transport',
    company: 'b',
    name: 'Transports Bonnet',
    email: 'exploitation@bonnet-transports.fr',
    domain: 'bonnet-transports.fr',
  },
  {
    key: 'clinique',
    company: 'b',
    name: 'Clinique Saint-Roch',
    email: 'informatique@clinique-saint-roch.fr',
    domain: 'clinique-saint-roch.fr',
  },
  {
    key: 'mairie',
    company: 'b',
    name: 'Mairie de Valbonne',
    email: 'communication@mairie-valbonne.fr',
    domain: 'mairie-valbonne.fr',
  },
  {
    key: 'camping',
    company: 'b',
    name: 'Camping Les Oliviers',
    email: 'reservation@camping-oliviers.fr',
    domain: 'camping-oliviers.fr',
  },
  {
    key: 'ecommerce',
    company: 'b',
    name: 'Savonnerie Provençale',
    email: 'shop@savonnerie-provencale.fr',
    domain: 'savonnerie-provencale.fr',
  },
  {
    key: 'industrie',
    company: 'b',
    name: 'Méca Précision SAS',
    email: 'dsi@meca-precision.fr',
    domain: 'meca-precision.fr',
  },
  {
    key: 'formation',
    company: 'b',
    name: 'Institut Formapro',
    email: 'admin@formapro-institut.fr',
    domain: 'formapro-institut.fr',
  },
  {
    key: 'restaurant',
    company: 'b',
    name: 'Restaurant La Table de Jules',
    email: 'jules@latabledejules.fr',
    domain: 'latabledejules.fr',
  },
  {
    key: 'ehpad',
    company: 'b',
    name: 'Résidence Les Glycines',
    email: 'direction@residence-glycines.fr',
    domain: 'residence-glycines.fr',
  },
  {
    key: 'syndic',
    company: 'b',
    name: 'Syndic Azur Gestion',
    email: 'gestion@azur-syndic.fr',
    domain: 'azur-syndic.fr',
  },
  {
    key: 'labo',
    company: 'b',
    name: 'Laboratoire BioAnalyses',
    email: 'it@bioanalyses-labo.fr',
    domain: 'bioanalyses-labo.fr',
  },
  {
    key: 'golf',
    company: 'b',
    name: 'Golf de la Vallée',
    email: 'accueil@golf-vallee.fr',
    domain: 'golf-vallee.fr',
  },
  {
    key: 'pharma',
    company: 'b',
    name: 'Pharmacie Centrale',
    email: 'pharmacie.centrale@wanadoo.fr',
  },
  {
    key: 'agri',
    company: 'b',
    name: 'Coopérative Agricole du Var',
    email: 'contact@coop-var.fr',
    domain: 'coop-var.fr',
  },
  {
    key: 'musee',
    company: 'b',
    name: 'Musée de la Lavande',
    email: 'contact@musee-lavande.fr',
    domain: 'musee-lavande.fr',
  },
  {
    key: 'assurance',
    company: 'b',
    name: 'Cabinet Assurances Morel',
    email: 'agence@morel-assurances.fr',
    domain: 'morel-assurances.fr',
  },
  {
    key: 'marine',
    company: 'b',
    name: 'Chantier Naval Rivière',
    email: 'bureau@chantier-riviere.fr',
    domain: 'chantier-riviere.fr',
  },
  {
    key: 'creche',
    company: 'b',
    name: 'Crèche Les Petits Pas',
    email: 'direction@petits-pas.fr',
    domain: 'petits-pas.fr',
  },
  {
    key: 'immo-b',
    company: 'b',
    name: 'Groupe Immo Riviera',
    email: 'si@immo-riviera.fr',
    domain: 'immo-riviera.fr',
  },
  {
    key: 'martin-avocat',
    company: 'b',
    name: 'Maître Martin',
    email: 'cabinet@maitre-martin.fr',
    domain: 'maitre-martin.fr',
  },
  {
    key: 'cinema',
    company: 'b',
    name: 'Cinéma Le Rex',
    email: 'programmation@cinema-lerex.fr',
    domain: 'cinema-lerex.fr',
  },
  {
    key: 'parfum',
    company: 'b',
    name: 'Parfumerie Delmas',
    email: 'boutique@parfumerie-delmas.fr',
    domain: 'parfumerie-delmas.fr',
  },
  {
    key: 'piscine',
    company: 'b',
    name: 'Piscines Azur Pro',
    email: 'devis@piscines-azur.fr',
    domain: 'piscines-azur.fr',
  },
  {
    key: 'concession',
    company: 'b',
    name: 'Concession Auto Sud',
    email: 'contact@autosud-concession.fr',
    domain: 'autosud-concession.fr',
  },
  {
    key: 'cabinet-medical',
    company: 'b',
    name: 'Maison Médicale Saint-Jean',
    email: 'secretariat@mm-saint-jean.fr',
    domain: 'mm-saint-jean.fr',
  },
  { key: 'ferme', company: 'b', name: 'Ferme du Grand Pré', email: 'ferme.grandpre@gmail.com' },
  {
    key: 'ong',
    company: 'b',
    name: 'Fondation Mer Propre',
    email: 'contact@fondation-merpropre.org',
    domain: 'fondation-merpropre.org',
  },
]

/**
 * Moment d'une tâche :
 *  - { days, at: 'HH:mm' }  jour relatif (0 = aujourd'hui) à une heure locale
 *  - { minutes }            relatif à maintenant (négatif = passé)
 *  - { days, allDay: true } journée entière (rappel à 9 h)
 */
export type When =
  { days: number; at: string } | { minutes: number } | { days: number; allDay: true }

export interface DemoTask {
  title: string
  client?: string
  company?: 'a' | 'b'
  status?: 'inbox' | 'todo' | 'done' | 'cancelled'
  due?: When
  remind?: When
  snooze?: When
  doneAgo?: { days: number } | { minutes: number }
  priority?: 'low' | 'normal' | 'high'
  origin?: 'mail' | 'mac' | 'siri' | 'app' | 'crm'
  recurrence?: string
  notes?: string
  uncertain?: boolean
  crmRef?: string
  attachment?: { filename: string; mime: string; content: string }
}

export const DEMO_TASKS: DemoTask[] = [
  // ---------------------------------------------------------- En retard
  {
    title: 'Rappeler Dupont pour la refonte du site',
    client: 'dupont',
    due: { minutes: -95 },
    priority: 'high',
    origin: 'siri',
    notes: 'Il veut une V2 avec réservation en ligne. Budget évoqué : 6 000 €.',
  },
  {
    title: 'Relance facture 2026-114',
    client: 'garage-martin',
    due: { days: -1, at: '10:00' },
    origin: 'crm',
    crmRef: 'crm_a:echeance:114',
  },
  {
    title: 'Certificat SSL expiré sur le site du Belvédère',
    client: 'hotel',
    due: { minutes: -40 },
    priority: 'high',
    origin: 'mail',
    notes:
      'De : Réception Hôtel Le Belvédère <reception@hotel-belvedere.fr>\n\nBonjour, le navigateur affiche « site non sécurisé » depuis ce matin…',
  },
  {
    title: 'Envoyer les accès FTP à Moreau',
    client: 'archi',
    due: { days: -3, at: '14:00' },
    origin: 'app',
  },
  {
    title: 'Vérifier les sauvegardes du serveur mutualisé',
    company: 'b',
    due: { days: -1, at: '17:00' },
    origin: 'mac',
    recurrence: 'FREQ=WEEKLY',
  },

  // ---------------------------------------------------------- Aujourd'hui
  {
    title: 'Point téléphonique avec la Mairie de Valbonne',
    client: 'mairie',
    due: { days: 0, at: '16:30' },
    origin: 'app',
  },
  {
    title: 'Préparer le devis boutique en ligne',
    client: 'ecommerce',
    due: { days: 0, at: '18:00' },
    priority: 'high',
    origin: 'app',
    notes: '120 produits, paiement Stripe, Colissimo.',
  },
  {
    title: 'Mettre en ligne la carte d’automne',
    client: 'restaurant',
    due: { days: 0, at: '19:00' },
    origin: 'mail',
    attachment: {
      filename: 'carte-automne.txt',
      mime: 'text/plain',
      content:
        'Entrées\n- Velouté de potimarron\n\nPlats\n- Daube provençale\n- Loup grillé, fenouil\n\nDesserts\n- Tarte fine aux figues\n',
    },
  },

  // ---------------------------------------------------------- 7 prochains jours
  {
    title: 'Envoyer le devis vitrine',
    client: 'horizon',
    due: { days: 1, at: '10:00' },
    origin: 'app',
  },
  {
    title: 'Formation WordPress pour l’équipe du Musée',
    client: 'musee',
    due: { days: 1, at: '14:00' },
    origin: 'app',
    notes: '2 h, en visio. Prévoir un compte éditeur de test.',
  },
  {
    title: 'Point avec Leroy sur le RGPD',
    client: 'leroy',
    due: { days: 2, at: '09:30' },
    origin: 'siri',
  },
  {
    title: 'Renouvellement hébergement',
    client: 'horizon',
    due: { days: 20, allDay: true },
    remind: { days: 3, at: '09:00' },
    origin: 'crm',
    crmRef: 'crm_b:renouvellement:2',
  },
  {
    title: 'Migrer les mails de Méca Précision vers Infomaniak',
    client: 'industrie',
    due: { days: 3, at: '08:00' },
    priority: 'high',
    origin: 'app',
  },
  {
    title: 'Rendez-vous photos produits',
    client: 'parfum',
    due: { days: 3, at: '15:00' },
    origin: 'app',
  },
  {
    title: 'Relance devis refonte',
    client: 'kine',
    due: { days: 4, at: '11:00' },
    origin: 'crm',
    crmRef: 'crm_a:relance:31',
  },
  {
    title: 'Ajouter le module de réservation',
    client: 'camping',
    due: { days: 5, allDay: true },
    origin: 'app',
  },
  {
    title: 'Rappeler Rivière pour la maintenance annuelle',
    client: 'marine',
    due: { days: 6, at: '10:30' },
    snooze: { days: 1, at: '09:00' },
    origin: 'app',
  },

  // ---------------------------------------------------------- Plus tard
  {
    title: 'Échéance facture F-2026-031',
    client: 'pomme',
    due: { days: 10, allDay: true },
    origin: 'crm',
    crmRef: 'crm_b:echeance:31',
  },
  {
    title: 'Payer l’hébergement OVH',
    company: 'a',
    due: { days: 12, allDay: true },
    origin: 'app',
    recurrence: 'FREQ=MONTHLY',
  },
  {
    title: 'Renouveler le nom de domaine cafedesarts.fr',
    client: 'cafe',
    due: { days: 18, allDay: true },
    remind: { days: 8, at: '09:00' },
    origin: 'crm',
    crmRef: 'crm_a:renouvellement:12',
  },
  {
    title: 'Bilan trimestriel SEO',
    client: 'vin',
    due: { days: 24, at: '10:00' },
    origin: 'app',
    recurrence: 'FREQ=MONTHLY;INTERVAL=3',
  },
  {
    title: 'Contrat de maintenance à renouveler',
    client: 'clinique',
    due: { days: 35, allDay: true },
    remind: { days: 5, at: '09:00' },
    origin: 'crm',
    crmRef: 'crm_b:renouvellement:7',
  },
  {
    title: 'Refonte de la newsletter mensuelle',
    client: 'association',
    due: { days: 28, allDay: true },
    priority: 'low',
    origin: 'app',
  },
  {
    title: 'Audit accessibilité du site de la crèche',
    client: 'creche',
    due: { days: 40, at: '09:00' },
    origin: 'app',
  },
  {
    title: 'Renouvellement certificat wildcard',
    client: 'immo-b',
    due: { days: 55, allDay: true },
    remind: { days: 25, at: '09:00' },
    origin: 'crm',
    crmRef: 'crm_b:renouvellement:15',
  },

  // ---------------------------------------------------------- À trier
  {
    title: 'Mise à jour des horaires sur le site',
    client: 'dupont',
    status: 'inbox',
    origin: 'mail',
    notes:
      'De : Jean Dupont <jean@dupont-btp.fr>\n\nBonjour,\n\nPouvez-vous mettre à jour nos horaires d’ouverture ? Nous fermons désormais à 17 h le vendredi.\n\nJean',
    attachment: {
      filename: 'horaires-2026.txt',
      mime: 'text/plain',
      content: 'Lundi–jeudi : 8 h – 18 h\nVendredi : 8 h – 17 h\n',
    },
  },
  { title: 'Appeler Martin pour le site', status: 'inbox', uncertain: true, origin: 'siri' },
  {
    title: 'Idée : offre maintenance « tranquillité » à 29 €/mois',
    status: 'inbox',
    origin: 'mac',
  },
  {
    title: 'Demande de devis : site vitrine',
    status: 'inbox',
    origin: 'mail',
    notes:
      'De : Sophie Arnaud <sophie.arnaud@gmail.com>\n\nBonjour, je lance mon activité de sophrologue et j’aurais besoin d’un petit site.',
  },
  {
    title: 'Regarder le thème proposé par Lise',
    client: 'fleurs',
    status: 'inbox',
    origin: 'mail',
  },
  {
    title: 'Penser à facturer la journée de formation',
    company: 'b',
    status: 'inbox',
    origin: 'siri',
  },

  // ---------------------------------------------------------- Faites aujourd'hui
  {
    title: 'Répondre au syndic pour l’accès extranet',
    client: 'syndic',
    status: 'done',
    due: { days: 0, at: '09:00' },
    doneAgo: { minutes: 180 },
    origin: 'mail',
  },
  {
    title: 'Corriger le formulaire de contact',
    client: 'optique',
    status: 'done',
    due: { days: 0, at: '10:00' },
    doneAgo: { minutes: 120 },
    origin: 'app',
  },
  {
    title: 'Envoyer la facture de septembre',
    client: 'expert',
    status: 'done',
    due: { days: 0, at: '11:00' },
    doneAgo: { minutes: 45 },
    origin: 'app',
  },

  // ---------------------------------------------------------- Historique
  {
    title: 'Mise en ligne du site',
    client: 'yoga',
    status: 'done',
    due: { days: -6, at: '10:00' },
    doneAgo: { days: 6 },
    origin: 'app',
  },
  {
    title: 'Configurer les DNS',
    client: 'yoga',
    status: 'done',
    due: { days: -8, at: '09:00' },
    doneAgo: { days: 8 },
    origin: 'app',
  },
  {
    title: 'Créer les boîtes mail',
    client: 'transport',
    status: 'done',
    due: { days: -4, at: '14:00' },
    doneAgo: { days: 4 },
    origin: 'app',
  },
  {
    title: 'Relance devis application mobile',
    client: 'formation',
    status: 'done',
    due: { days: -10, at: '10:00' },
    doneAgo: { days: 9 },
    origin: 'crm',
    crmRef: 'crm_b:relance:4',
  },
  {
    title: 'Remplacer les photos de la page équipe',
    client: 'dentiste',
    status: 'done',
    due: { days: -2, at: '16:00' },
    doneAgo: { days: 2 },
    origin: 'mail',
  },
  {
    title: 'Optimiser les images du catalogue',
    client: 'menuiserie',
    status: 'done',
    due: { days: -12, at: '11:00' },
    doneAgo: { days: 11 },
    origin: 'app',
  },
  {
    title: 'Activer la double authentification WordPress',
    client: 'notaire',
    status: 'done',
    due: { days: -15, at: '10:00' },
    doneAgo: { days: 15 },
    origin: 'app',
  },
  {
    title: 'Ancien devis abandonné',
    client: 'golf',
    status: 'cancelled',
    due: { days: -20, at: '10:00' },
    origin: 'crm',
    crmRef: 'crm_b:relance:2',
  },
]

export const DEMO_EXTRA_RANDOM_TASKS = [
  'Mettre à jour les extensions WordPress',
  'Vérifier le référencement local Google',
  'Changer la bannière d’accueil',
  'Ajouter les mentions légales',
  'Répondre aux avis Google',
  'Mettre à jour la page tarifs',
  'Contrôler les formulaires',
  'Renouveler la clé API Google Maps',
]
