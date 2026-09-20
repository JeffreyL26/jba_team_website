# jba-team.com

Die Studio-Website von jba~team: „Small team. Big playground." Ein unabhängiges
Studio, das Apps, Websites und Spiele entwirft, baut und selbst veröffentlicht,
„from the first sketch to the store release". Die Seite ist englischsprachig,
von Hand geschriebenes HTML ohne Build-Schritt, veröffentlicht auf Cloudflare
Pages. Im Rampenlicht wechseln sich ScanConvert („the Travel Tool that reads
prices through your camera") und oHRganize ab; oHRganize hat seinen eigenen
Auftritt unter ohrganize.com und hier nur den Testerbereich.

```bash
npx wrangler pages dev public       # lokal mit Functions, http://localhost:8788
npx wrangler pages deploy public    # veröffentlicht public/ als Produktionsstand
```

Für die Seiten allein genügt jeder statische Server auf `public/`; nur die
Functions unter `/api/` brauchen Wrangler.

## Seiten

| Adresse | Inhalt |
|---|---|
| `/` | Rampenlicht mit Zähler („01 / 02") und Bühne: ScanConvert und oHRganize im Wechsel, jeder mit Untertitel, Satz, Chips und Knopf. Darunter das Laufband „websites ~ apps ~ games ~ experiences ~ tools ~ prototypes ~", dann `~/studio` („Small team. Big playground.", vier Fakten: independent, design + code, based in Germany, est. 2026) und `~/contact` („Got an idea? Let's build it.") mit der Adresse zum Gedrückthalten |
| `/scanconvert` | Produktseite: Kopf mit Symbol und Play-Store-Knopf, About, Features, To our testers, Changelog |
| `/ohrganize-testers` | Privater Downloadbereich für eingeladene oHRganize-Tester („Are you a tester? Download here."). Anmeldung mit E-Mail und Passwort, `noindex`, nirgends verlinkt (Abschnitt Testerbereich) |
| `/privacy`, `/terms` | Datenschutz und Nutzungsbedingungen für ScanConvert und die Website, je dreizehn Abschnitte, nur aus der Fußzeile verlinkt |
| `/404` | „Scanned everything. Nothing found." Die Ziffern reagieren auf den Zeiger. Pages liefert die Seite für jede unbekannte Adresse aus |
| `/hrmonic-testers` | Weiterleitung (301) auf `/ohrganize-testers`, die alte Adresse vor der Umbenennung am 07.09.2026 |

Pages liefert alle Seiten ohne Endung aus und leitet `/privacy.html` mit 308
auf `/privacy` um; die kanonischen Adressen in den Seiten und in der Sitemap
sind deshalb die ohne Endung.

## Ton und Gestaltung

Die Seite spricht kurz und direkt: „We like small, sharp tools over bloated
platforms, playful details over corporate polish, and shipping over pitching."
Die Tilde ist das Leitmotiv, vom Namen jba~team über die Abschnittsköpfe als
Pfade (`~/studio`, `~/contact`) bis zum Laufband. Überschriften der Unterseiten
stehen in spitzen Klammern (`< Privacy Policy >`), Vorzeilen und Chips in
Monospace.

- **Farben:** Papier `#F7F5FB` und Tinte `#171522`, dazu der Verlauf von Blau
  `#3300F3` über Violett `#8A44FC` und Magenta `#FB00C3` zu Rosa `#FF81D8`.
  Flächen in Pastell (Blau, Violett, Rosa, Pfirsich), das Grün `#1F9D6B` gehört
  ScanConvert.
- **Bewegung:** Die Startseite legt eine Shader-Fläche mit three.js unter
  alles, ein langsam wandernder Verlauf auf der Grafikkarte statt eines
  Weichzeichners. GSAP mit ScrollTrigger führt alles, was am Scrollstand hängt;
  GSAP allein ist auf jeder Seite für Einblendungen da.
- **Schrift:** Space Grotesk für Display, Plus Jakarta Sans für Fließtext,
  JetBrains Mono für Vorzeilen, Chips und Pfade. Alle drei liegen als variable
  Schriften in `public/assets/fonts/` (latin und latin-ext, SIL Open Font
  License); es geht keine Anfrage an Google.
- **Kleine Belohnungen:** die Adresse, die sich durch Gedrückthalten kopiert
  („click & hold to copy"); die Ziffern der 404-Seite; das Rampenlicht, das mit
  Pfeilen und Zähler weiterblättert.

## Aufbau

```
public/                     Wird unverändert veröffentlicht
  index.html                Startseite; die Spotlight-Einträge stehen im Datenblock des Skripts
  scanconvert.html          Produktseite ScanConvert
  ohrganize-testers.html    Testerbereich: Anmeldung und Download
  privacy.html, terms.html  Rechtstexte
  404.html                  Fehlerseite, von Pages automatisch ausgeliefert
  _redirects                Alte Testeradresse auf die neue (Abschnitt Deploy)
  robots.txt                Testerbereich und /api/ vom Crawlen ausgenommen
  sitemap.xml               Nur die vier indexierbaren Seiten
  site.webmanifest          Name, Farben, Symbole
  app-ads.txt               AdMob-Freigabe für die ScanConvert-App; Google Play prüft sie unter der Website-Domain
  assets/                   Logos, Symbole, OG-Bild, fonts.css und die Schriften
functions/api/
  tester-login.js           Anmeldung: POST setzt das Cookie, GET prüft es, DELETE löscht es
  ohrganize-download.js     Installer: signierte R2-Adresse oder Strom über das Binding
wrangler.toml               Projektname, Ausgabeverzeichnis, R2-Binding
```

Jede Seite trägt Stylesheet und Skript in der eigenen Datei; geteilt ist nur
`assets/fonts.css`. Eine Änderung an Kopf- oder Fußzeile ist deshalb in sechs
Dateien zu machen. **Inhalte ändern:** direkt in der jeweiligen HTML-Datei. Die
Texte des Rampenlichts stehen in einem Datenblock am Ende von `index.html`;
dort wartet auch eine auskommentierte Vorlage für die nächste App („next app
goes here").

## Testerbereich

Eingeladene Tester laden den oHRganize-Installer über `/ohrganize-testers`.
Der Ablauf:

1. Das Formular schickt E-Mail und Passwort per POST an `/api/tester-login`.
   Die Function vergleicht den SHA-256 des Passworts mit der Tabelle `USERS` in
   `tester-login.js` und setzt bei Erfolg das Cookie `ohrganize_tester`:
   HMAC-signiert mit `TESTER_SECRET`, zwölf Stunden gültig, HttpOnly, Secure,
   SameSite=Lax.
2. Der Download-Knopf führt auf `/api/ohrganize-download`. Ohne gültiges Cookie
   antwortet die Function mit 302 auf die Testerseite. Mit Cookie und
   gesetzten R2-Schlüsseln leitet sie auf eine signierte R2-Adresse (AWS
   Signature V4, zehn Minuten gültig): Der Installer kommt dann direkt aus dem
   Speicher statt durch den Worker, der große Dateien stark drosselt. Fehlen
   die Schlüssel, streamt sie über das Binding `RELEASES` (langsam, aber es
   geht).

Das Objekt heißt `oHRganize-Setup-1.0.0.exe` und liegt im Bucket
`hrmonic-releases`. Der Name stammt aus der HRMONIC-Zeit und bleibt mit
Absicht: R2-Buckets lassen sich nicht umbenennen, und Nutzer sehen ihn nie.
Eine neue Fassung wird unter demselben Schlüssel hochgeladen oder bekommt in
`ohrganize-download.js` neuen `OBJECT_KEY` und `FILENAME`.

**Tester anlegen:** Hash bilden (`printf %s 'passwort' | sha256sum`), E-Mail
und Hash in `USERS` eintragen, veröffentlichen. Siehe dazu den Hinweis unter
Bekannte Grenzen.

## Deploy auf Cloudflare Pages

Die Website läuft unter https://jba-team.com und https://www.jba-team.com
(Pages-Projekt `jba-team`, Ersatzadresse `jba-team.pages.dev`, Konto
`9ba41a3e9f1a260309e64d295e0701cc`). Jede Veröffentlichung bekommt zusätzlich
eine eigene Adresse `<kennung>.jba-team.pages.dev`, die erhalten bleibt.
Veröffentlicht wird per Direct Upload, es gibt keine Git-Anbindung im
Dashboard:

```bash
npx wrangler whoami                   # Anmeldung prüfen, sonst: npx wrangler login
npx wrangler pages deploy public      # Produktionszweig main
npx wrangler pages deployment list --project-name jba-team
```

Zu beachten:

- **`wrangler.toml` ist die Quelle der Projekteinstellungen.** Sobald sie
  `pages_build_output_dir` trägt, gleicht `wrangler pages deploy` die
  Bindings der Datei mit dem Dashboard ab. Das R2-Binding `RELEASES` auf
  `hrmonic-releases` muss deshalb darin stehen, sonst verliert der nächste
  Deploy den Download. `npx wrangler pages download config jba-team` holt den
  Stand aus dem Dashboard zum Vergleich (Produktion: `compatibility_date`
  2026-08-01).
- **Drei Secrets liegen nur im Dashboard:** `TESTER_SECRET`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (ein R2-API-Token mit Object
  Read auf den Bucket). Setzen mit
  `npx wrangler pages secret put NAME --project-name jba-team`. Lokal springt
  `tester-login.js` auf einen Entwicklungsschlüssel zurück, damit
  `wrangler pages dev` ohne `.dev.vars` läuft.
- **`public/_redirects`** enthält nur die Umleitung der alten Testeradresse.
  Kein Auffangen unbekannter Adressen: Die Seite ist keine
  Single-Page-Anwendung, Pages liefert `404.html` von selbst.
- **Keine `public/_headers`.** Pages setzt `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin` und
  `Access-Control-Allow-Origin: *` von sich aus. Eine Content-Security-Policy
  müsste `cdnjs.cloudflare.com` und `'unsafe-inline'` für die Skripte in den
  Seiten erlauben; bis dahin gibt es keine.
- **Prüfen, ob lokal und live übereinstimmen:** jede Datei unter
  `https://<kennung>.jba-team.pages.dev/<pfad>` abrufen und die Prüfsumme mit
  `public/<pfad>` vergleichen. Das Deployment vom 10.09.2026 zählt 27 Dateien
  (`_redirects` zählt Pages nicht mit).

Bis zum 21.09.2026 lag die Seite nur lokal und im Deployment. Seither ist
dieses Repository die Quelle; `.claude/` und `.wrangler/` bleiben draußen, und
`.gitattributes` hält alle Textdateien auf LF, damit die Arbeitskopie Byte für
Byte dem entspricht, was veröffentlicht wird.

## Bekannte Grenzen

- **Tester stehen als E-Mail und ungesalzener SHA-256 im Quelltext**
  (`USERS` in `tester-login.js`). Wer das Repository lesen kann, sieht beide;
  ein schwaches Passwort ließe sich aus dem Hash erraten. Der nächste Schritt
  ist eine Tabelle außerhalb des Codes (Secret oder KV) mit gesalzenen Hashes.
- **Skripte von cdnjs:** GSAP 3.12.5 auf jeder Seite, dazu ScrollTrigger und
  three.js r128 auf der Startseite, ohne Subresource-Integrity. Fällt cdnjs
  aus, bleibt die Seite lesbar, aber ohne Bewegung. Selbst hosten in
  `assets/` wäre der sauberere Weg.
- **Kein geteiltes Layout.** Kopf, Fuß und Grundstile stehen sechsmal. Solange
  die Seite sechs Dateien hat, ist das tragbar; bei der siebten lohnt ein
  Bausatz.
- **Der Kontakt ist eine Adresse, kein Formular.** Gedrückthalten kopiert sie;
  ein Formular bräuchte eine Function und einen Versanddienst.
