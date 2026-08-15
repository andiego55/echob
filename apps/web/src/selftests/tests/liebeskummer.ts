import type { SelfTest } from '../types'

/**
 * Liebeskummer – dimensionaler Test (concern: hoch = stärker im Liebeskummer gefangen).
 * Fünf Bereiche: Sehnsucht & Gedankenkreisen, Alltag & Körper, Selbstwert,
 * Kontakt & Festhalten, Blick nach vorn (reverse). Nicht-diagnostisch, warm.
 * Kein safety-Box (kein Gewalt-Framing), aber Krisenhinweis im Disclaimer.
 */
export const liebeskummer: SelfTest = {
  slug: 'liebeskummer',
  category: 'trennung',
  title: 'Liebeskummer: wie sehr hält es dich noch?',
  teaser:
    'Trennung überstanden – aber es tut noch weh? Fünf Bereiche zeigen dir, wo du im Liebeskummer gerade stehst und was dir helfen kann. Ganz ohne Urteil.',
  description:
    'Dieser Selbsttest schaut in fünf Bereichen darauf, wie sehr dich der Liebeskummer gerade im Griff hat: Sehnsucht und Gedankenkreisen, dein Alltag und dein Körper, dein Selbstwert, das Festhalten am Kontakt und dein Blick nach vorn. Er misst keinen „Fortschritt", den du schaffen müsstest, und verurteilt nichts – Liebeskummer darf wehtun und braucht Zeit. Er hilft dir, deinen Stand einzuordnen und einen nächsten Schritt zu finden. Das Ergebnis kannst du anschließend mit Echo besprechen.',
  duration: '8–10 Min',
  resultMode: 'dimensional',
  polarity: 'concern',
  intro:
    'Eine Trennung zu verarbeiten ist harte Arbeit, und sie verläuft in Wellen, nicht auf einer geraden Linie. Dieser Test hilft dir zu sehen, wo du gerade stehst – ohne Wertung, ohne „du müsstest schon weiter sein". Antworte, wie es sich in den letzten ein, zwei Wochen angefühlt hat. Niemand außer dir sieht deine Antworten.',
  echo: {
    opening_question:
      'Dein Ergebnis zeigt, was dich gerade am meisten festhält. Was davon möchtest du als Erstes anschauen – das, was am lautesten wehtut, oder das, wo du dir einen Schritt zutraust?',
  },
  dimensions: [
    {
      key: 'sehnsucht',
      name: 'Sehnsucht & Gedankenkreisen',
      description: 'Wie sehr die Person und das „Was wäre, wenn" deinen Kopf einnehmen.',
      bands: [
        { min: 0, label: 'Es lässt dich los', tone: 'good', text: 'Die Person taucht in deinen Gedanken auf, nimmt aber nicht mehr den ganzen Raum ein. Du kannst dich auf anderes einlassen.' },
        { min: 40, label: 'Ständig präsent', tone: 'watch', text: 'Deine Gedanken kehren oft zu ihr oder ihm zurück, du spielst Szenen und Möglichkeiten immer wieder durch. Das ist normaler Teil des Trennungsschmerzes – anstrengend, aber vorübergehend.' },
        { min: 65, label: 'Gedanklich gefangen', tone: 'alert', text: 'Fast alles dreht sich um die Person; das Grübeln lässt dir kaum Ruhe. Das kostet viel Kraft. Es kann helfen, das Kreisen bewusst zu unterbrechen – und dir jemanden zum Reden zu holen.' },
      ],
    },
    {
      key: 'alltag',
      name: 'Alltag & Körper',
      description: 'Wie sehr Schlaf, Appetit, Konzentration und Antrieb betroffen sind.',
      bands: [
        { min: 0, label: 'Weitgehend im Tritt', tone: 'good', text: 'Schlaf, Essen und Konzentration sind halbwegs stabil. Der Alltag trägt dich, auch wenn Traurigkeit dazugehört.' },
        { min: 40, label: 'Der Alltag leidet', tone: 'watch', text: 'Schlaf, Appetit oder Konzentration sind spürbar aus dem Gleichgewicht. Dein Körper leidet mit – gib ihm gerade besonders das Nötige: Ruhe, Essen, Bewegung, Menschen.' },
        { min: 65, label: 'Kaum tragfähig', tone: 'alert', text: 'Der Liebeskummer greift stark in deinen Alltag ein – du funktionierst kaum noch. Das ist ein ernstzunehmendes Signal. Bitte hol dir Unterstützung; du musst da nicht allein durch.' },
      ],
    },
    {
      key: 'selbstwert',
      name: 'Selbstwert & Selbstvorwürfe',
      description: 'Wie sehr die Trennung an deinem Wert und deinem Selbstbild nagt.',
      bands: [
        { min: 0, label: 'Selbstwert stabil', tone: 'good', text: 'Du machst die Trennung nicht an deinem Wert fest. Du kannst traurig sein, ohne an dir selbst zu zweifeln.' },
        { min: 40, label: 'Angekratzt', tone: 'watch', text: 'Du fragst dich, ob du nicht genug warst, suchst die Schuld bei dir. Solche Gedanken sind verständlich – aber sie sind Schmerz, der spricht, nicht die Wahrheit.' },
        { min: 65, label: 'Tief erschüttert', tone: 'alert', text: 'Die Trennung hat dein Selbstbild stark getroffen; du wertest dich hart ab. Dein Wert hängt nicht an dieser Beziehung. Diesen Blick wieder geradezurücken ist Arbeit, die sich lohnt – gern mit Begleitung.' },
      ],
    },
    {
      key: 'kontakt',
      name: 'Kontakt & Festhalten',
      description: 'Wie sehr du noch am Kontakt und an der Verbindung festhältst.',
      bands: [
        { min: 0, label: 'Innerlich gelöst', tone: 'good', text: 'Du hältst nicht mehr aktiv am Kontakt fest und mühst dich nicht, die Verbindung am Leben zu halten. Der nötige Abstand ist da.' },
        { min: 40, label: 'Noch verbunden', tone: 'watch', text: 'Du prüfst Profile, ringst mit Nachrichten oder hoffst auf ein Zeichen. Jeder Kontakt hält die Wunde offen – eine bewusste Kontaktsperre könnte dir Raum zum Heilen geben.' },
        { min: 65, label: 'Am Festhalten', tone: 'alert', text: 'Du klammerst dich stark an Kontakt und Hoffnung. Das ist menschlich, verlängert aber den Schmerz. Der schwerste, wirksamste Schritt ist meist, den Kontakt für eine Weile ganz loszulassen.' },
      ],
    },
    {
      key: 'neuorientierung',
      name: 'Blick nach vorn',
      description: 'Wie sehr du wieder Zuversicht und eine Zukunft für dich spürst.',
      bands: [
        { min: 0, label: 'Zuversicht wächst', tone: 'good', text: 'Du kannst dir eine gute Zukunft ohne die Person vorstellen und findest Stück für Stück zu dir zurück. Das trägt.' },
        { min: 40, label: 'Zwischen Rückschau und Aufbruch', tone: 'watch', text: 'Mal keimt Zuversicht, mal zieht es dich zurück. Dieses Hin und Her ist genau, wie Heilung sich anfühlt – kein Rückschritt, sondern der Weg.' },
        { min: 65, label: 'Noch kein Weiterkommen', tone: 'alert', text: 'Ein Leben ohne die Person scheint dir gerade kaum vorstellbar. Das heißt nicht, dass es so bleibt – nur, dass du noch mitten drin bist. Kleine Schritte und Unterstützung können den Blick wieder öffnen.' },
      ],
    },
  ],
  overallBands: [
    { min: 0, label: 'Auf einem guten Weg', tone: 'good', text: 'Der Schmerz ist da, aber er beherrscht dich nicht mehr. Du bist mitten im Heilen – sei weiter geduldig und gut zu dir.' },
    { min: 40, label: 'Mitten im Liebeskummer', tone: 'watch', text: 'Der Liebeskummer hält dich gerade spürbar. Das ist völlig normal und kein Versagen. Abstand, Menschen, Struktur und Geduld helfen – und das Sortieren einzelner Situationen, statt sie im Kopf zu drehen.' },
    { min: 62, label: 'Stark belastet', tone: 'alert', text: 'Der Liebeskummer nimmt dich gerade sehr mit und greift tief in deinen Alltag. Bitte trag das nicht allein: Sprich mit Menschen, die dir guttun, und hol dir Unterstützung, wenn es zu schwer wird.' },
  ],
  questions: [
    // Sehnsucht & Gedankenkreisen
    { id: 'lk_s1', type: 'scale', section: 'Deine Gedanken', dimension: 'sehnsucht', text: 'Ich denke den größten Teil des Tages an die Person.' },
    { id: 'lk_s2', type: 'scale', section: 'Deine Gedanken', dimension: 'sehnsucht', text: 'Ich spiele Momente aus der Beziehung immer wieder im Kopf durch.' },
    { id: 'lk_s3', type: 'scale', section: 'Deine Gedanken', dimension: 'sehnsucht', text: 'Ich frage mich ständig, was gewesen wäre, wenn …' },
    { id: 'lk_s4', type: 'scale', section: 'Deine Gedanken', dimension: 'sehnsucht', text: 'Ich vermisse die Person körperlich – ihre Nähe, ihre Stimme, ihren Geruch.' },
    { id: 'lk_s5', type: 'scale', section: 'Deine Gedanken', dimension: 'sehnsucht', text: 'Ich kann mich auf andere Dinge einlassen, ohne dass sie ständig dazwischenfunkt.', reverse: true },
    // Alltag & Körper
    { id: 'lk_a1', type: 'scale', section: 'Alltag & Körper', dimension: 'alltag', text: 'Ich schlafe schlecht, seit wir getrennt sind.' },
    { id: 'lk_a2', type: 'scale', section: 'Alltag & Körper', dimension: 'alltag', text: 'Mein Appetit hat sich stark verändert (kaum Hunger oder Essen als Trost).' },
    { id: 'lk_a3', type: 'scale', section: 'Alltag & Körper', dimension: 'alltag', text: 'Ich kann mich schlecht konzentrieren – bei der Arbeit, beim Lesen, im Gespräch.' },
    { id: 'lk_a4', type: 'scale', section: 'Alltag & Körper', dimension: 'alltag', text: 'Mir fehlt der Antrieb für Dinge, die sonst selbstverständlich sind.' },
    { id: 'lk_a5', type: 'scale', section: 'Alltag & Körper', dimension: 'alltag', text: 'Ich komme im Alltag im Großen und Ganzen zurecht.', reverse: true },
    // Selbstwert & Selbstvorwürfe
    { id: 'lk_w1', type: 'scale', section: 'Blick auf dich', dimension: 'selbstwert', text: 'Ich frage mich, ob ich nicht genug war.' },
    { id: 'lk_w2', type: 'scale', section: 'Blick auf dich', dimension: 'selbstwert', text: 'Ich gebe mir die Schuld daran, dass es zu Ende ging.' },
    { id: 'lk_w3', type: 'scale', section: 'Blick auf dich', dimension: 'selbstwert', text: 'Ich habe das Gefühl, ohne diese Person weniger wert zu sein.' },
    { id: 'lk_w4', type: 'scale', section: 'Blick auf dich', dimension: 'selbstwert', text: 'Ich fürchte, nie wieder so eine Liebe zu finden.' },
    { id: 'lk_w5', type: 'scale', section: 'Blick auf dich', dimension: 'selbstwert', text: 'Ich weiß um meinen Wert, auch ohne diese Beziehung.', reverse: true },
    // Kontakt & Festhalten
    { id: 'lk_k1', type: 'scale', section: 'Kontakt & Festhalten', dimension: 'kontakt', text: 'Ich schaue nach, was die Person online tut, oder bin versucht, es zu tun.' },
    { id: 'lk_k2', type: 'scale', section: 'Kontakt & Festhalten', dimension: 'kontakt', text: 'Ich ringe damit, ihr oder ihm zu schreiben – oder tue es immer wieder.' },
    { id: 'lk_k3', type: 'scale', section: 'Kontakt & Festhalten', dimension: 'kontakt', text: 'Ich hoffe insgeheim auf ein Zeichen oder ein Zurück.' },
    { id: 'lk_k4', type: 'scale', section: 'Kontakt & Festhalten', dimension: 'kontakt', text: 'In meiner Erinnerung wird die Beziehung oft schöner, als sie war.' },
    {
      id: 'lk_k5', type: 'single', section: 'Kontakt & Festhalten', dimension: 'kontakt',
      text: 'Wenn ich an eine Kontaktsperre denke …',
      options: [
        { label: 'brauche ich sie nicht mehr, ich habe innerlich Abstand.', value: 0 },
        { label: 'halte ich sie meistens, mit Mühe.', value: 2 },
        { label: 'nehme ich sie mir vor, werde aber immer wieder schwach.', value: 3 },
        { label: 'kann ich mir gar nicht vorstellen, den Kontakt zu lassen.', value: 4 },
      ],
    },
    // Blick nach vorn (reverse → hoher Score = wenig Zuversicht)
    { id: 'lk_n1', type: 'scale', section: 'Blick nach vorn', dimension: 'neuorientierung', text: 'Ich kann mir langsam eine gute Zukunft ohne diese Person vorstellen.', reverse: true },
    { id: 'lk_n2', type: 'scale', section: 'Blick nach vorn', dimension: 'neuorientierung', text: 'Ich entdecke wieder Dinge, die mir Freude machen.', reverse: true },
    { id: 'lk_n3', type: 'scale', section: 'Blick nach vorn', dimension: 'neuorientierung', text: 'Ich sehe inzwischen auch das, was an der Beziehung nicht gut war.', reverse: true },
    { id: 'lk_n4', type: 'scale', section: 'Blick nach vorn', dimension: 'neuorientierung', text: 'Ich glaube, dass ich darüber hinwegkommen werde.', reverse: true },
    { id: 'lk_n5', type: 'scale', section: 'Blick nach vorn', dimension: 'neuorientierung', text: 'Ich merke, wie ich Stück für Stück wieder zu mir selbst finde.', reverse: true },
    // Freitext
    { id: 'lk_t1', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was fällt dir gerade am schwersten?' },
    { id: 'lk_t2', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was oder wer tut dir in diesen Tagen gut?' },
    { id: 'lk_t3', type: 'text', optional: true, section: 'Zum Schluss', text: 'Wenn du ehrlich bist: Was hat in der Beziehung nicht gepasst – auch wenn die Sehnsucht das gerade überdeckt?' },
    { id: 'lk_t4', type: 'text', optional: true, section: 'Zum Schluss', text: 'Was wäre ein kleiner, machbarer Schritt für dich in den nächsten Tagen?' },
  ],
  disclaimer:
    'Dieser Test ist eine Einordnung zur Selbstreflexion, keine Diagnose. Liebeskummer darf wehtun und braucht Zeit – es gibt kein „zu langsam". Wenn du aber das Gefühl hast, es nicht mehr auszuhalten, dich ganz zu verlieren oder Gedanken kommen, nicht mehr leben zu wollen, sprich bitte mit jemandem: Telefonseelsorge 0800 111 0 111 oder 0800 111 0 222 (kostenlos, rund um die Uhr). Bei akuter Gefahr: Notruf 112.',
}
