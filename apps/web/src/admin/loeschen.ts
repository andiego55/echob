/**
 * Was beim Löschen eines Kontos passiert — in Worten, bevor es passiert.
 *
 * **Warum das eine eigene Datei ist.** Der Knopf ist trivial, der Satz daneben nicht. Eine
 * Löschung hat je nach Rolle völlig verschiedene Folgen: Bei einer Klient:in fallen ihre
 * Fälle, bei einer Fachperson bleiben die Fälle ihrer Klient:innen bestehen, und bei einem
 * Institut verlieren Studierende ihren Zugang, die von alldem nichts wissen. Wer nur
 * „Konto wirklich löschen?" fragt, hat nicht gefragt.
 *
 * **Das Tippen ist Absicht.** Ein „Wirklich?"-Dialog wird weggeklickt; den Namen der
 * richtigen Zeile abzutippen zwingt dazu, sie noch einmal anzusehen. Das ist die einzige
 * Sicherung, die es hier gibt — einen Papierkorb gibt es nicht.
 */
import type { LoeschErgebnis, UserRow } from './api'
import { ROLLEN_LABEL } from './nutzerzeile'

/** Das Wort, das abgetippt werden muss: der Name — und ohne Namen der Anfang der Kennung. */
export function loeschWort(row: Pick<UserRow, 'name' | 'user_id'>): string {
  return row.name?.trim() || row.user_id.slice(0, 8)
}

/**
 * Groß-/Kleinschreibung und Leerzeichen am Rand zählen nicht.
 *
 * Es geht darum, die richtige Zeile bewusst zu benennen, nicht darum, fehlerfrei
 * abzuschreiben. Ein Dialog, der an einem Leerzeichen scheitert, erzieht nur dazu, den
 * Namen zu kopieren — und damit ist die Sicherung wieder weg.
 */
export function bestaetigt(
  eingabe: string, row: Pick<UserRow, 'name' | 'user_id'>,
): boolean {
  return eingabe.trim().toLocaleLowerCase('de') === loeschWort(row).toLocaleLowerCase('de')
}

/**
 * Der einzige Grund, den die Oberfläche selbst kennt.
 *
 * Alles andere (Beispielkonten, erfundene Fallpersonen) prüft der Server — und die
 * betreffenden Zeilen stehen ohnehin nicht in dieser Liste.
 */
export function darfLoeschen(
  row: Pick<UserRow, 'user_id'>, eigeneKennung: string | null | undefined,
): string | null {
  if (eigeneKennung && row.user_id === eigeneKennung) {
    return 'Das ist dein eigenes Konto — damit wäre auch dieser Bereich weg.'
  }
  return null
}

/**
 * Was mit diesem Konto verschwindet, je Rolle benannt.
 *
 * Die Zahlen kommen aus derselben Zeile, die daneben in der Tabelle steht. Fehlt eine
 * Angabe, steht sie hier gar nicht — geraten wird nicht.
 */
export function loeschUmfang(row: UserRow): string[] {
  const punkte: string[] = []
  const zahl = (n: number | null | undefined) => (n === null || n === undefined ? null : n)

  if (row.rolle === 'client') {
    const f = zahl(row.faelle)
    const s = zahl(row.szenen)
    if (f !== null) {
      punkte.push(
        `${f} ${f === 1 ? 'Fall' : 'Fälle'}${s !== null ? ` mit ${s} ${s === 1 ? 'Szene' : 'Szenen'}` : ''}`
        + ' — samt Echo-Verläufen, Auswertungen und Berichten',
      )
    }
    if (row.verbindungen) {
      punkte.push(
        `${row.verbindungen} aktive ${row.verbindungen === 1 ? 'Freigabe endet' : 'Freigaben enden'}`
        + ' — die Fachpersonen verlieren den Zugang sofort',
      )
    }
  } else if (row.rolle === 'professional') {
    if (row.verbindungen) {
      punkte.push(
        `${row.verbindungen} ${row.verbindungen === 1 ? 'Verbindung' : 'Verbindungen'} zu`
        + ' Klient:innen enden. Deren Fälle bleiben ihnen erhalten',
      )
    }
    punkte.push('alle eigenen Notizen, Erkenntnisse, Berichte und Vorlagen')
    punkte.push('der unterschriebene AVV und der bestätigte Schweigepflicht-Hinweis')
  } else if (row.rolle === 'institute') {
    // Die unangenehmste Folge, und die einzige, die andere Menschen trifft, die gerade
    // nichts davon ahnen. Sie gehoert nach oben.
    if (row.verbindungen) {
      punkte.push(
        `${row.verbindungen} ${row.verbindungen === 1 ? 'Studierende:r verliert' : 'Studierende verlieren'}`
        + ' den Zugang samt aller Arbeitskopien',
      )
    }
    punkte.push('das Institut mit seinen Beispielfällen und Zugangscodes')
  } else if (row.rolle === 'student') {
    punkte.push('die eigenen Arbeitskopien und Einreichungen')
  }

  if (row.im_verzeichnis) {
    punkte.push('der Verzeichnis-Eintrag bleibt bestehen, geht aber offline')
  }
  punkte.push('das Login-Konto — die Person kann sich danach nicht mehr anmelden')
  return punkte
}

/** Ein Konto in mehreren Rollen: Gelöscht wird die Person, nicht die Zeile. */
export function weitereRollen(row: UserRow, alle: UserRow[]): string[] {
  return alle
    .filter(r => r.user_id === row.user_id && r.rolle !== row.rolle)
    .map(r => ROLLEN_LABEL[r.rolle])
}

/** Was hinterher dastand — der Beleg, nicht nur „erledigt". */
export function ergebnisText(e: LoeschErgebnis): string {
  if (!e.ok) return e.grund ?? 'Nicht gelöscht.'
  const tabellen = Object.keys(e.tabellen).length
  const kopf = `${e.zeilen} ${e.zeilen === 1 ? 'Zeile' : 'Zeilen'} in ${tabellen} `
    + `${tabellen === 1 ? 'Tabelle' : 'Tabellen'} gelöscht`
  if (e.auth_konto === 'war_bereits_weg') {
    return `${kopf}. Das Login-Konto war schon weg — genau dafür ist dieser Knopf da.`
  }
  if (e.auth_konto === 'fehlgeschlagen') {
    return `${kopf}, aber das Login-Konto ließ sich nicht entfernen. `
      + 'Es muss im Supabase-Dashboard von Hand weg, sonst bleibt eine Anmeldung ohne Daten.'
  }
  return `${kopf}, Login-Konto entfernt.`
}
