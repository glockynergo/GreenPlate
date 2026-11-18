# GreenPlate

GreenPlate è un prototipo interattivo in italiano per prenotare cibo invenduto scontato e ritirarlo in negozio. Include 6 attività e 14 offerte dimostrative.

L’app usa Next.js e TypeScript. Catalogo, accessi, scorte, preferiti e ordini funzionano nel browser. È sufficiente aprire il sito su un singolo dispositivo e alternare il profilo cliente e venditore. Le modifiche si conservano con il salvataggio locale del browser.

## Prova il flusso

1. Apri **Accedi → Prova come cliente**.
2. Cerca **Box ritiro immediato**, scegli la quantità e conferma l’ordine simulato. Copia il codice dalla conferma.
3. Esci, poi apri **Accedi → Prova come venditore**. Inserisci il codice nella dashboard di Forno Brera e conferma il ritiro.
4. Rientra come cliente e apri **Ordini** per vedere il ritiro e il risparmio. Per provare l’annullamento, scegli **Box del fornaio** prima dell’inizio della fascia.
5. In dashboard puoi anche creare, modificare e disattivare offerte, provare il suggerimento di prezzo e segnalare eccedenze per donazione.

Puoi registrare profili locali con dati inventati. Per l’accesso manuale usa il codice demo `GreenPlate2026!` con l’email del profilo locale. Le email incluse sono `cliente@greenplate.test` e `venditore@greenplate.test`.

Le fasce sono calcolate nel fuso Europe/Rome a partire dal primo avvio della demo. Usa **Ripristina demo** nel piè di pagina per ricreare le fasce e riportare il browser allo stato iniziale. Il pulsante chiede conferma prima di eliminare le modifiche e gli ordini di prova.

## Avvio locale

Con Node.js 22 LTS o successivo:

```sh
npm ci
npm run dev
```

Apri `http://localhost:3000`.

## Deploy su Vercel

Importa il repository con il preset **Next.js** e mantieni le impostazioni di build predefinite. Per un progetto Vercel esistente, esegui il deploy dell’ultimo commit di `main`. La demo funziona senza database, migrazioni e variabili d’ambiente.

## Verifica

```sh
npm run build
npm run test:flows
```

I test coprono registrazione e accesso di prova, preferiti, prenotazioni ripetute, scorte, annullamento, gestione delle offerte, ritiro, scadenza, ripristino e lettura di una sessione salvata.

## Limiti della demo

Profili e modifiche sono locali al browser e non si sincronizzano tra dispositivi. Gli accessi e i controlli sui ruoli servono a simulare l’esperienza. Usa esclusivamente dati fittizi. Il checkout simula la ripartizione 20% GreenPlate e 80% venditore senza raccogliere carte né effettuare addebiti. La donazione è una segnalazione dimostrativa. Le fotografie di categoria provengono da [Unsplash](https://unsplash.com/).
