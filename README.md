# GreenPlate

Prototipo full stack in italiano per prenotare cibo invenduto e ritirarlo in negozio. Usa Next.js 15, TypeScript, Prisma 6 e SQLite. Per la demo bastano Node.js 22 LTS o successivo e npm.

## Avvio locale

Apri un terminale nella cartella del progetto ed esegui questi comandi.

```sh
cp .env.example .env
npm ci
npm run db:setup
npx prisma generate
npm run db:seed
npm run dev
```

Su PowerShell, usa `Copy-Item .env.example .env` per il primo passaggio. Apri `http://localhost:3000`. Il database di default è `prisma/greenplate.db`.

| Ruolo | Email | Password |
| --- | --- | --- |
| Cliente | `cliente@greenplate.test` | `GreenPlate2026!` |
| Venditore · Forno Brera | `venditore@greenplate.test` | `GreenPlate2026!` |

Con `DEMO_MODE=true`, il seed prepara 6 attività fittizie e 14 offerte dimostrative. Di queste, 12 sono acquistabili all’avvio, una è esaurita e una è segnalata per donazione. Le fasce sono relative alla prima esecuzione del seed. Ripetere il seed conserva ordini, scorte, modifiche e fasce esistenti.

Per una nuova presentazione con fasce aggiornate, imposta in `.env` un nuovo nome, ad esempio `DATABASE_URL="file:./presentazione.db"`, poi esegui di nuovo `npm run db:setup` e `npm run db:seed`. Riavvia il server se era già attivo. Il database precedente resta disponibile.

## Percorso per la presentazione

1. Accedi come venditore, apri **Nuova offerta** e pubblica un box. Imposta una fascia futura per provare l’annullamento oppure una fascia già iniziata con fine futura per verificare subito il ritiro.
2. Accedi come cliente in un'altra finestra o esci dall’account venditore. Cerca il box per titolo, città o negozio, aprilo, scegli la quantità e conferma l’ordine simulato.
3. Apri la conferma e copia il codice. Durante la fascia, accedi come venditore e usalo nella dashboard. Accedendo di nuovo come cliente, vedrai l’ordine ritirato e il risparmio.
4. Se vuoi provare il ritiro subito dopo il seed, cerca **Box ritiro immediato**. Per l’annullamento usa **Box del fornaio** prima dell’inizio della sua fascia.

## Dati e flussi

- Il catalogo è pubblico. Gli account cliente gestiscono preferiti, ordini attivi e storico. Il venditore modifica i dati della propria attività e gestisce le proprie offerte, ritiri e segnalazioni di donazione.
- Prezzi in centesimi interi. L’ordine conserva i dati dell’offerta e del negozio al momento dell’acquisto. La commissione è il 20% del totale arrotondato al centesimo più vicino. La quota venditore è la differenza. Il saldo in dashboard include gli ordini simulati confermati, ritirati e non ritirati.
- La conferma registra l’ordine e scala la scorta in un’unica transazione SQLite. Una nuova trasmissione della stessa conferma torna allo stesso ordine. L’annullamento prima del ritiro ripristina la scorta una sola volta. Il codice è univoco e utilizzabile durante la fascia indicata. Gli ordini scaduti passano a **Non ritirato** quando si apre l’area ordini o la dashboard pertinente.
- Le date vengono salvate come istanti e inserite e mostrate nel fuso Europe/Rome. Gli orari ambigui o inesistenti al cambio dell’ora vengono rifiutati.
- Password protette con scrypt e salt individuale. Le sessioni scadono dopo 7 giorni, usano cookie HTTP-only con SameSite=Lax e token conservati nel database sotto forma di hash. Ogni modifica verifica ruolo e appartenenza lato server.
- Il suggerimento prezzo propone una riduzione maggiore vicino all’orario di ritiro. Per applicarlo il venditore deve selezionarlo e salvare l’offerta.

## Verifica

```sh
npm run build
npm run test:flows
```

La suite avvia un'istanza su un database temporaneo e verifica registrazione, email univoche, sessioni, login e logout, creazione e modifica di offerte, filtri, autorizzazioni tra negozi, preferiti, donazioni, acquisti concorrenti, annullamento, ritiro monouso, scadenze e persistenza. Usa la porta 4191, configurabile con `GREENPLATE_TEST_PORT`.

## Limiti del prototipo

Il checkout è simulato. L’app non chiede dati di carte, non effettua addebiti e non esegue accrediti. La donazione è una segnalazione del venditore, senza invii a enti o automatismi fiscali. Foto delle offerte tramite URL HTTPS facoltativo, con fotografia di categoria in alternativa. La copertina è generata per il prototipo e le immagini delle categorie provengono da [Unsplash](https://unsplash.com/).

La configurazione di esempio è per sviluppo locale. Per un’istanza HTTPS imposta `COOKIE_SECURE=true` e usa un database separato con `DEMO_MODE=false`. Se un reverse proxy cambia l’host visto dal server, imposta `APP_ORIGIN` con l’origine HTTPS effettiva. Il prototipo non include verifica email, recupero password o limitazione dei tentativi di accesso.
