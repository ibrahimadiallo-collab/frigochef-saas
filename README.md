# FrigoChef — Professional AI SaaS (7-Figure Scale)

Benvenuto nel futuro della gestione della cucina. FrigoChef è stato ricostruito da zero con un'architettura professionale, scalabile e pronta per il mercato globale.

## 🚀 Caratteristiche del Progetto
*   **Architettura Monorepo:** Struttura professionale per separare frontend, backend e configurazioni.
*   **Next.js 15 + Tailwind CSS:** Interfaccia premium, veloce e responsive.
*   **AI Integration:** Integrazione avanzata con Claude (Anthropic) per ricette iper-personalizzate.
*   **SaaS Infrastructure Ready:**
    *   **Supabase:** Autenticazione e database già configurati nel codice.
    *   **Stripe:** Predisposizione per pagamenti ricorrenti e abbonamenti.
    *   **Framer Motion:** Animazioni fluide per una User Experience di alto livello.

## 🛠 Tech Stack
*   **Framework:** Next.js (App Router, TypeScript)
*   **Styling:** Tailwind CSS (Modern styles)
*   **Database/Auth:** Supabase
*   **Payments:** Stripe
*   **AI:** Anthropic Claude 3.5 Sonnet
*   **Icons:** Lucide React
*   **Animations:** Framer Motion

## 📦 Struttura della Cartella
*   `apps/web`: L'applicazione principale (qui vive tutto il codice attuale, incluse le librerie in `src/lib`).
*   `packages/database`: *(placeholder)* in futuro: schemi Supabase e logica dati condivisa.
*   `packages/stripe`: *(placeholder)* in futuro: logica per pagamenti e webhooks.
*   `packages/config`: *(placeholder)* in futuro: configurazioni condivise (Tailwind, ESLint).

> ⚠️ I `packages/*` sono attualmente segnaposto: la logica reale di database, Stripe e config risiede dentro `apps/web`.

## 🏁 Come Iniziare

1.  **Installa le dipendenze:**
    ```bash
    npm install
    ```

2.  **Configura le Variabili d'Ambiente:**
    Copia il file `.env.example` in `.env.local` dentro `apps/web` e inserisci le tue chiavi:
    *   `ANTHROPIC_API_KEY`
    *   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY`
    *   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3.  **Avvia lo sviluppo:**
    ```bash
    npm run dev
    ```

## 📈 Prossimi Passi per le 7 Figure
*   **Integrazione Webhooks:** Configura i webhook di Stripe per attivare automaticamente il tier Pro nel database Supabase.
*   **Fridge Vision:** Implementa il caricamento foto per permettere all'utente di fotografare il frigo invece di scrivere.
*   **Partnership:** Collega i link affiliati Amazon Fresh e Glovo tramite le API di logistica.

---
© 2025 FrigoChef SAAS · Architected by Gemini CLI
