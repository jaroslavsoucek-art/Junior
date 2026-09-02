# Junior 2014 – sestavy 7+1

Lokální PWA pro trenéra mladších žáků: **sestavy** jako hlavní účel – kádr, šablony sestav, příprava zápasu (docházka, startovní osmička, plán střídání) a během zápasu přehled, kdo je na hřišti, se střídáním dvěma tapy a rotací jedním tlačítkem.
Bez backendu, bez účtů, bez sítě v runtime. Data žijí v `localStorage` telefonu.

> **Od 2. 9. 2026 appka neměří čas a nevede průběh zápasu.** Hodiny půle, minuty hráčů, odpočet rotace, vytížení, nastavení délky půle i celý tab **Live** byly odstraněny na přání trenéra – při používání to bylo navíc. Appka má tři taby: **Kádr**, **Zápas** (příprava: docházka → startovní sestava → plán střídání → „Zápas odehrán“, což přípravu zamkne) a **Sestava** (šablony + editor). `Match.events` a `status: 'live'` v datech zůstávají jen kvůli kompatibilitě starých záloh; migrace storage v5 převede rozehraný zápas na odehraný. Sekce níž, které mluví o minutách nebo Live, popisují historii návrhu.

**Živě:** https://jaroslavsoucek-art.github.io/Junior/ (GitHub Pages, nasazuje se automaticky z `main`).

## Nasazení na Netlify (sdílení s kolegy)

Nejrychlejší je ruční deploy: `npm run build` vyrobí `dist/` pro root URL (bez `BASE_PATH`), ten zabalíš a přetáhneš na Netlify.

```bash
npm run build && (cd dist && zip -qr ../release/junior-netlify.zip .)
```

app.netlify.com → *Add new site* → *Deploy manually* → přetáhnout `release/junior-netlify.zip` (nebo složku `dist/`). Netlify dá HTTPS adresu `https://<název>.netlify.app`, na které PWA funguje včetně instalace na plochu a offline. Pro napojení na repo je v rootu `netlify.toml` (build `npm ci && npm test && npm run build`, publish `dist`, `sw.js` bez cache). `public/_redirects` posílá všechny cesty na `index.html`.

Pozor: každá adresa (GitHub Pages / Netlify) má vlastní `localStorage`, data se mezi nimi nesdílí – přenos je přes export/import JSON.

## Spuštění

```bash
npm install
npm run dev        # vývojový server, --host → dostupný i z telefonu na stejné Wi-Fi
```

Vývojový server neregistruje service worker. Offline chování testuj na produkčním buildu:

```bash
npm run build      # tsc + vite build + generování sw.js a manifestu do dist/
npm run preview    # servíruje dist/ na http://<IP-počítače>:4173 (--host)
npm test           # Vitest – logika výpočtu minut
npm run icons      # přegeneruje ikony z loga scripts/logo-src.png (Swift/CoreGraphics, potřebuje Xcode CLT)
```

### Instalace na plochu telefonu

- **iOS Safari:** otevřít URL → Sdílet → *Přidat na plochu*. Poznámka: iOS instaluje PWA jen z Safari a service worker vyžaduje HTTPS nebo `localhost`. Přes LAN `http://192.168.x.x:4173` se appka spustí, ale offline cache se na iOS neuloží – pro reálný test instalace použij nasazení na GitHub Pages (HTTPS).
- **Android Chrome:** otevřít URL → v menu *Přidat na plochu* / *Instalovat aplikaci*. Chrome nabídne instalaci automaticky, když je manifest + SW v pořádku.

## Nasazení na GitHub Pages

1. Vytvoř repo (např. `junior`) a pushni `main`.
2. V repu: *Settings → Pages → Source: GitHub Actions*.
3. Workflow `.github/workflows/pages.yml` při každém pushi buildne s `BASE_PATH=/<repo>/` a nasadí `dist/`.
4. Appka běží na `https://<user>.github.io/<repo>/` – tuhle adresu otevři v Safari / Chrome a přidej na plochu.

Lokálně stejný build vyrobíš přes `BASE_PATH=/junior/ npm run build`. Bez `BASE_PATH` se builduje pro root `/`.

Aktualizace: `registerType: 'autoUpdate'` – nová verze SW se stáhne na pozadí a aktivuje při dalším otevření appky. Během živého zápasu se nic nereloaduje samo.

## Sdílení dat mezi telefony (Firebase, volitelné)

Bez nastavení je appka čistě offline v telefonu. Když chceš data sdílet s kolegy, zapojí se Firebase Firestore – bez uživatelských účtů, přes sdílený **kód klubu**.

### Jednorázové nastavení ve Firebase konzoli

1. Vytvoř projekt (nebo použij existující) → *Build → Firestore Database → Create database* (production mode, region `europe-west3`).
2. *Build → Authentication → Sign-in method → Anonymous → Enable.* Appka se přihlašuje anonymně jen proto, aby pravidla mohla vyžadovat přihlášeného klienta.
3. *Firestore → Rules* → vlož obsah souboru `firestore.rules` z repa a publikuj. Pravidla pouští jen cestu `teams/{kód}/squads/{A|B}`, kód musí mít 16–64 znaků, dokument musí mít správný tvar a velikost pod 950 kB.
4. *Project settings → Your apps → Add app → Web* → zkopíruj objekt `firebaseConfig`.

### Konfigurace v appce

- **Netlify (doporučeno):** *Site configuration → Environment variables* → `VITE_FIREBASE_CONFIG` = objekt `firebaseConfig` jako JSON na jeden řádek (viz `.env.example`). Po redeployi je Firebase zapnutý pro všechny, kdo appku otevřou z Netlify.
- **Bez redeploye / GitHub Pages:** Nastavení → *Sdílení mezi telefony* → *Vložit konfiguraci Firebase* – bere JS blok z konzole i JSON, uloží se jen do tohoto telefonu.

Web API key Firebase není tajemství (je v každé webové appce), přístup hlídají pravidla + neuhodnutelný kód klubu.

### Používání

1. Jeden trenér v Nastavení dá *Vygenerovat* kód klubu a *Sdílet* ho kolegům (24 znaků).
2. Kolegové kód vloží do stejného pole. Kód platí pro oba týmy, každý tým má v cloudu vlastní dokument.
3. **⬆ Nahrát do cloudu** pošle kompletní stav aktivního týmu (kádr, sestavy, zápasy, formace, nastavení). **⬇ Stáhnout z cloudu** ukáže náhled „teď / po stažení“ a po potvrzení přepíše telefon.
4. Appka hlídá přepsání: když je v cloudu novější verze, než jsi naposledy stáhl, nahrání chce potvrzení. Poslední nahrání vyhrává – žádné slučování.

Doporučený rytmus: kdo připravuje sestavu, nahraje; kdo jede na zápas, před ním stáhne a po zápase nahraje. Během zápasu ovládá hodiny jeden telefon. Automatická synchronizace se slučováním eventů je možná další fáze.

Firebase SDK se načítá až při prvním použití synchronizace (dynamický import), takže offline start i velikost úvodního bundlu zůstávají – bez nakonfigurovaného Firebase appka pořád nedělá žádný síťový request.

## Struktura

```
src/
  types.ts          datový model (Player, Formation, Lineup, Match, MatchEvent)
  data/seed.ts      kádr Junior 2014 + 5 formací se souřadnicemi
  store/index.ts    zustand + persist (localStorage, klíč junior-v1)
  lib/minutes.ts    computeMinutes, clockState, onPitch, withoutLastBatch – pure funkce, Vitest
  lib/season.ts     seasonSeconds – součet minut přes dohrané zápasy
  lib/exportImport.ts  buildExport / parseImport (validace) / previewImport
  lib/lineup.ts     remapAssignments (změna formace), orderBench (návrhy), roleFit, buildCustomFormation
  lib/pitchGeometry.ts  převod souřadnic slotu (0..1) na SVG viewBox 100×150
  lib/match.ts      startingLineup (uložená sestava × docházka → prázdné označené sloty)
  lib/rotation.ts   proposeRotation, cyclePairOff, playSecondsSince, rotationAnchor, computeLoad
  hooks/useNow.ts   1 s tick jen pro překreslení + okamžitý re-render při visibilitychange
  hooks/useWakeLock.ts  navigator.wakeLock s re-requestem po návratu do popředí
  lib/cloud.ts      Firebase Firestore snapshot sync (kód klubu, anonymní auth, lazy import)
  lib/team.ts       tým A/B – klíč storage, migrace, čtení kádru druhého týmu
  lib/id.ts         generátor id (randomUUID s fallbackem pro http LAN)
  components/       TabBar, RoleChip, Modal (bottom sheet, Btn, Confirm), PlayerEditor,
                    Pitch (SVG), SlotMarker, BenchTile, FormationModal, LineupsModal, NamePrompt,
                    MatchForm, LineupPreview (read-only hřiště), RotationSheet, LoadPanel
  screens/          Roster (+ Settings pod ozubeným kolem), Match, Lineup, Live
scripts/gen-icons.swift  ikony z loga klubu (scripts/logo-src.png), bílé pozadí, maskable v 80 % safe zóně
```

## Rozhodnutí, která jsem udělal sám

- **React 18** (dle zadání) na **Vite 8** a **Tailwind v4** (plugin `@tailwindcss/vite`, tokeny v `@theme` v `index.css`, žádný `tailwind.config`).
- **Role v UI** mají česká zkratky: GK, OB (obrana), SZ (střední záložník), KŘ (křídlo), ÚT (útok). Barvy rolí jsou v `index.css`.
- **Souřadnice formací**: brankář y = 0.12 (níž by se jmenovka ořízla o okraj SVG), obrana ~0.27, střed ~0.5–0.6, útok ~0.8. Slot id = `<formationId>-gk`, `<formationId>-1..7`.
- **Ikony** jsou z loga SK Junior Praha (`scripts/logo-src.png`). Logo má průhledné pozadí, které by iOS na ploše vykreslil černě, proto jsou ikony podložené bílou a oříznuté na obsah (`gen-icons.swift` najde bounding box neprůhledných pixelů). Favicon v prohlížeči je průhledný PNG 64/32 px.
- **Persist** ukládá jen data (`players, formations, lineups, matches, settings`), ne akce. Klíč `junior-v1`, `version: 1` – při změně schématu přidám `migrate`.
- **Seed** se použije jen když v `localStorage` nic není. Smazání dat = návrat k seedu.
- **Export na iOS**: standalone PWA na iOS neumí spolehlivě `<a download>`, proto export nejdřív zkusí Web Share API se souborem (share sheet → „Uložit do Souborů“) a teprve když není, použije klasický download. Soubor má obálku `{ schema: 'junior', version, exportedAt, data }`; import bere i holý objekt dat.
- **Import** je striktní: odmítne neplatný JSON, chybějící pole, neznámou roli, formaci bez 8 slotů nebo soubor z novější verze. Před přepsáním ukáže tabulku „teď / po importu“ a jména hráčů, kteří přibudou a zmizí.
- **Deaktivovaný hráč** zůstává v datech (kvůli minutám v historii), v kádru je ve sbalené sekci „Mimo kádr“ a jde znovu aktivovat v editoru.
- **Nastavení** je pod ozubeným kolem na Kádru, ne vlastní tab. Modaly nejdou zavřít tapem mimo, jen tlačítkem – v rukavicích by omylem zmizela rozepsaná úprava.

### Editor sestavy (fáze 4)

- **Draft** (`store.draft`) je rozpracovaná sestava: formace, obsazení, odkaz na uloženou sestavu a volitelně `matchId`. Je persistovaný (přežije zabití appky), ale není součástí exportu – je to stav UI, ne data. Tečka `•` u názvu = neuložené změny.
- **Tap model**: výběr je buď hráč z lavičky, nebo slot. Lavička→slot nasadí (vytlačený jde na lavičku), slot→slot prohodí (funguje i s prázdným = přesun), slot→„↓ na lavičku“ odebere. Druhý tap na totéž výběr zruší. Při vybraném hráči se sloty s nekompatibilní rolí ztlumí, při vybraném slotu se lavička přeřadí: přesná role → stejná skupina → ostatní, uvnitř podle nejmenšího počtu sezónních minut. Je to pořadí návrhů, nic se nenasazuje samo.
- **Změna formace** nikoho neshodí: `remapAssignments` přiřazuje nejdřív stejnou roli, pak stejnou skupinu (křídlo ↔ střeďák), zbytek do volných slotů.
- **Vlastní formace**: počty OB / SZ / KŘ / ÚT (součet 7), souřadnice se dopočítají (křídla vně, střeďáci uvnitř). Seedové formace nejdou smazat, vlastní ano.
- **Drag & drop** (`@dnd-kit/core`) je jen vrstva navrch: `PointerSensor` s `distance: 8` a `TouchSensor` s `delay: 180 ms`, aby obyčejný tap i horizontální scroll lavičky zůstaly tapem/scrollem. Drop cíle: sloty (SVG `<g>` – dnd-kit potřebuje jen `getBoundingClientRect`) a celá lavička (= odebrat). `DragOverlay` bez drop animace.
- **Lavička** má dvě řádky a scrolluje vodorovně: na 375 px telefonu je vidět 8 dlaždic najednou.

### Zápas – příprava (fáze 5)

- **Docházka** je pole `availablePlayerIds` na zápase. Nový zápas má všechny aktivní hráče přítomné – trenér odklikává ty, kdo chybí (méně tapů). Dlaždice 3 ve sloupci, výška 64 px; nepřítomný je bílý a přeškrtnutý.
- **Startovní sestava** je odkaz `startingLineupId` na uloženou sestavu. `startingLineup()` ji protne s docházkou: nepřítomný hráč nechá slot prázdný a označený („chybí“ + oranžový obrys), v detailu je seznam chybějících jmen.
- **Šablona vs. zápasová sestava.** Uložené sestavy bez `matchId` jsou šablony („základ“). „Upravit pro zápas“ udělá kopii s `matchId` a názvem `vs Soupeř d. m.` a otevře ji v editoru – šablona zůstane netknutá. Zápasová kopie je jen jedna na zápas, při smazání zápasu zmizí. V seznamu šablon se zápasové kopie nezobrazují.
- **Editor v zápasovém režimu** (`draft.matchId`): lavička = jen přítomní hráči, chybějící přiřazení jsou na hřišti označení jako prázdné sloty, čítač počítá jen přítomné. Prostřední tlačítko je „← vs Soupeř“: uloží a vrátí do detailu zápasu.
- **Nová sestava pro zápas**: v detailu vyber formaci → vznikne prázdná zápasová sestava a otevře se editor.
- **Navigace** (`tab`, `activeMatchId`) je persistovaná – po zabití appky se otevře stejný tab a stejný zápas. Zápas ve stavu `live`/`finished` má docházku i sestavu zamčenou.
- **Tlačítko „Přejít na Live“** je aktivní až s kompletní osmičkou přítomných hráčů a ≥ 8 v docházce.

### Live (fáze 6)

- **Zahájit zápas** zapíše `PLAYER_ON` pro startovní osmičku a přepne `status: live`. Čas půle se spustí až tlačítkem „Start 1. půle“ (`PERIOD_START`). Během přípravy před výkopem tedy nikomu nenaskakují minuty.
- **Ovládání půle**: běží → „Pauza“ a „Konec N. půle“ (obě zapíšou `PERIOD_END`; z eventů se pauza od konce půle nepozná a ani nemusí). Zastaveno → „Pokračovat“ (`PERIOD_START` stejné půle) a „Start N+1. půle“, u poslední půle „Konec zápasu“. Špatně stisknutý „Konec půle“ je tím pádem vratný přes „Pokračovat“. Po délce půle se čas zbarví oranžově a běží dál (nastavení).
- **Střídání dvěma tapy** v libovolném pořadí: hráč na hřišti + hráč z lavičky → `SUB`. Bez dialogu. Prázdný slot + lavička → `PLAYER_ON`; vybraný hráč + „▼ jen dolů“ → `PLAYER_OFF` (zranění, vyloučení). Toast na 5 s s „Vzít zpět“ = smazání celé poslední dávky eventů (`withoutLastBatch`), takže rotace 4 hráčů se vrátí jedním tapem a součty se přepočítají.
- **Minuty** u každého hráče na hřišti i na lavičce jsou `computeMinutes(match, now)`, nic se neukládá. Lavička je řazená vzestupně; hráč výrazně pod průměrem (≥ 2 min a pod 70 % průměru) má oranžový rámeček.
- **Rotace**: odpočet „Střídání za m:ss“ běží z *herního* času od posledního střídání nebo startu půle (`playSecondsSince` – v pauze stojí). Po vypršení pruh zoranžoví, Android zavibruje (`navigator.vibrate`), iOS jen barva. Tap otevře návrh: tolik dvojic, kolik je hráčů na lavičce, nejmíň hrající jde první, každý za nejvíc hrajícího na kompatibilním postu (role slotu: přesná → skupina → kdokoli; brankář jen s `rotateGoalkeeper`; čistý brankář na lavičce se bez toho nenavrhuje). Tap na odcházejícího hráče přepne na dalšího kompatibilního, ✕ dvojici vyřadí, „Provést“ zapíše všechny `SUB` se stejným `at`.
- **Vytížení**: sbalený panel, průměr a odchylka v minutách pro všechny přítomné, tečka = na hřišti.
- **Konec zápasu** (s potvrzením) doplní chybějící `PERIOD_END`, nastaví `finished`, zamkne ovládání a rozbalí Vytížení. Minuty se od té chvíle počítají do sezónního součtu na Kádru.
- **Obnova**: Live se po startu appky vrátí k rozehranému zápasu (persistovaný `tab` + `activeMatchId`, a když chybí, najde se zápas se `status: live`).

### UX kolo 1 (po fázi 6)

- **Tok napříč appkou**: Kádr → Sestava (postav a ulož šablonu) → tlačítko „Připravit zápas s touto sestavou →“ přímo v editoru založí zápas s touto sestavou → detail zápasu má očíslované kroky 1 Docházka · 2 Startovní sestava · 3 Střídání a rotace · 4 Zápas → Live.
- **Plán střídání v přípravě** (`Match.rotationGroups`: slotId → hráči, kteří se na tom postu točí). Každý hráč z lavičky má řádek „↔ za koho“; tap přepíná posty seřazené podle fitu (jeho post → příbuzný → jiný → netočí se). „Navrhnout podle postů“ = `planRotationGroups`: nejlepší fit, přednost mají posty bez parťáka, aby se minuty rozložily na co nejvíc pozic. Když plán chybí, vytvoří se automaticky při zahájení zápasu.
- **Live layout**: hlavička (hodiny + ovládání půle) v jednom řádku, pod ní jedno velké tlačítko „Provést rotaci (n) · za m:ss / TEĎ“ s tužkou pro úpravu, hřiště jako dominantní prvek (`flex-1`, ~430 px na 812 px displeji), lavička v jednom řádku, dole Vytížení (bottom sheet) a Konec zápasu.
- **Live jedním tlačítkem**: „Provést rotaci (n)“ provede plánované dvojice. `proposeFromPlan`: v každé skupině jde na hřiště ten z lavičky s nejmíň minutami za aktuálního hráče na postu; hráči mimo plán se doplní obecným pravidlem. „Upravit“ otevře stejný návrh k ruční změně. Po každém střídání se plán synchronizuje (`absorbSubs`), takže příště se točí zpět ten, kdo šel dolů.
- **Kádr** je řazený podle postů od brankáře (skupinové nadpisy), uvnitř abecedně; druhé řazení podle minut zůstává.
- **Barvy podle loga**: `--color-primary` námořnická modř (#161c4b) pro tlačítka, aktivní tab a nadpisy; `--color-accent` klubová červená (#a4172a) pro varování a výběr; zlatá (#f2b826) jako doplňkový token. Hřiště zůstává zelené, to je čitelnost na slunci. Logo (`src/assets/logo.png`, průhledné) je v hlavičce Kádru, Zápasu a Live.

### Seznamy jako vstup do tabů

- **Sestava** otevře seznam uložených šablon (`LineupsListScreen`): otevřít v editoru, náhled hřiště, přejmenovat, duplikovat, smazat, „+ Nová sestava“; rozpracovaná neuložená sestava má vlastní kartu „Pokračovat“. Zápasové kopie jsou ve sbaleném oddílu. Editor je pod tím, prostřední tlačítko v jeho liště je „← název“ zpět na seznam.
- **Zápas** otevře vždy seznam zápasů (i když byl detail otevřený); detail je podstránka se šipkou zpět. V seznamu jde zápas smazat (ne během hry), u dohraného s upozorněním, že zmizí minuty ze sezónního součtu.
- Tap na tab v dolní liště vždy přistane na seznamu; hluboké odkazy (nový zápas ze sestavy, „Upravit pro zápas“) skočí rovnou do detailu/editoru. Stav `matchDetailId` a `lineupView` je persistovaný, `activeMatchId` (pro Live) je od něj oddělený a Live vždy preferuje právě hraný zápas.

### Dva týmy (A / B)

- **Přepínač týmu** je v Nastavení. Každý tým má úplně oddělená data pod vlastním klíčem (`junior-v1-A`, `junior-v1-B`): kádr, sestavy, zápasy, minuty, rozpracovanou sestavu i nastavení. Aktivní tým je v `junior-team`. Přepnutí appku znovu načte, protože zustand store se vytváří nad konkrétním klíčem (`lib/team.ts`). Původní data z `junior-v1` se při prvním startu přesunou pod tým B.
- **Kádr přijímá jen hráče z druhého týmu** („+ Přidat hráče z týmu A/B“ čte kádr druhého týmu ze storage, nebo jeho seed). Hostující hráč má žlutý štítek s písmenem domovského týmu a v původním týmu zůstává. Volné přidávání hráčů podle zadání není – kdyby přišel nový kluk, přidá se do seedu nebo importem.
- **Áčko** (11 hráčů): GK Vašek · OB Filip, Mára, Vojta · SZ Patrik, Petr · KŘ Kotě, Oski, Sam, Vondris · ÚT Gabriel. Hráč bez postu (když ho trenér v editoru smaže) má v návrzích neutrální fit. Změna seedu má `SEED_REVISION`; store bez vlastních dat (žádné zápasy ani sestavy) si při startu vezme nový seed, store s daty zůstane netknutý.
- **Export/import** je per tým: soubor `junior-A-<datum>.json` nese `team`, import do jiného týmu se odmítne s vysvětlením.
- Hlavičky obrazovek mají zlatý štítek s písmenem aktivního týmu.

### Nové UI (Claude Design, kolo 2)

Implementace návrhu „Junior – nové UI“ (soubor `.dc.html` z Claude Design, přenesený přes prohlížeč). Funkce a tap model zůstaly, mění se řeč:

- **Typografie Archivo** – self-hosted přes `@fontsource/archivo` (500–900, latin + latin-ext kvůli diakritice). Žádný request na Google Fonts; písma jsou v precache SW.
- **Tokeny** v `index.css` jako CSS proměnné (`--bg`, `--surface`, `--line`, `--text`, `--heading`, `--muted`, `--btn-primary-*`, `--accent*`, `--gold*`, `--pitch*`) mapované do Tailwindu přes `@theme inline`, takže utility jako `bg-surface` nebo `text-heading` mění hodnotu podle `data-theme`. **Tmavý režim**: `settings.theme` = light / dark / system (`hooks/useTheme.ts`), přepínač v Nastavení → Vzhled; hřiště zůstává zelené, v tmavém režimu tmavší (#1c4d31). Primární tlačítka jsou ve světlém režimu navy, v tmavém zlatá.
- **Vlastní čárové ikony** (`components/icons.tsx`) místo emoji. **Plovoucí navigační pilulka** (`TabBar`) jen na přehledových obrazovkách (Kádr, Zápasy, Sestavy); detail zápasu, editor a Live mají vlastní šipku zpět a využívají celou výšku. Live položka svítí červeně s tečkou, když zápas běží.
- **Kádr**: hlavička s logem v dlaždici, zlatý štítek TÝM, segmentové řazení „Podle postu / Nejmíň minut“, skupiny s tečkou a počtem, řádky se čtvercovým štítkem postu, pruhem odehraných minut (relativně k maximu v kádru) a štítky „A“ (hostující) / „MÁLO MINUT“ (pod průměrem).
- **Zápasy**: karty se stavem (červená „HRAJE SE“ s běžícím časem a odpočtem rotace, „PŘIPRAVENO“ se čtyřmi pruhy kroků, „DOHRÁNO“ s ø minut na hráče). **Detail**: číslované sekce v kartách, docházka sbalená na 5 dlaždic + „+N VŠICHNI“ (nepřítomní vždy vidět), náhled sestavy 116 px s upozorněním na chybějící, „Plán rotace“ jako řádek otevírající bottom sheet, lepivé CTA „Přejít na Live“ na scrimu.
- **Sestavy**: seznam s miniaturou hřiště, karta rozpracované sestavy, akce Náhled / Duplikovat / Smazat (přejmenování v náhledu), zápasové kopie sbalené. **Editor**: lišta formace ▾ · ← název · Uložit, hřiště v kartě s rádiusem 22, výběr hráče jako zlatá pilulka s nápovědou, lavička v jednom řádku (92 × 76).
- **Live**: navy hero blok (label půle, hodiny 46 px, zlatý progres půle, pauza + Konec půle), červené CTA „Provést rotaci“ s výpisem dvojic a odpočtem/TEĎ, tužka pro úpravu, hřiště dominantní (jmenovka + minuty v pilulce), lavička 90 × 74, dole Vytížení (sheet) a Konec zápasu. Toast se zlatým „Vzít zpět“.
- **Nastavení**: tým (zlatý segment), Vzhled, výchozí hodnoty jako steppery − / + (nahrazují číselná pole, řeší i bug s mazáním hodnoty), řádek „Záloha a sdílení“ → podobrazovka s exportem/importem a cloudem, Nebezpečná zóna.
- **Kolo 2 návrhu** (verze souboru z 16:17): Live „před výkopem“ jako vlastní obrazovka (logo, karta startovní osmičky, navy karta času 00:00, červené „Zahájit zápas“ 68 px, „← Zpět na přípravu“ dole), Live „dohráno“ se shrnutím (celkový čas, štítek V SEZÓNĚ) a vytížením přímo v obrazovce („Zobrazit všech N“), modály podle sekce „Modály a stavy“: editor hráče s přepínačem „V kádru“ (`Switch`), formulář zápasu s přepínačem brankáře a „Vytvořit zápas“, formace jako mřížka 3 sloupce + karty vlastní formace, uložení sestavy s nápovědou, cloud karta (kód s tlačítkem Sdílet uvnitř pole, Nahrát do cloudu / Stáhnout, řádek „Naposledy nahráno“), „Mimo kádr“ jako sbalená karta s kompaktními řádky.
- Ověřeno v iOS simulátoru reálnými tapy: sestavení 8/8, uložení, založení zápasu ze sestavy, plán rotace, Live start, jednotlačítková rotace s undo, ukončení zápasu, tmavý režim.

## Dodatek k zadání: rotace lavičky (fáze 5 + 6)

Trenér chce točit všechny hráče na lavičce v pevném intervalu (např. 5 min) na jejich postech.

- **Nastavení u zápasu:** `rotationIntervalMin` (default 5, `settings.defaultRotationIntervalMin`) a `rotateGoalkeeper` (default `false`). Nastavuje se v přípravě, jde měnit i v Live.
- **Odpočet:** pod časem půle „Střídání za m:ss“. Počítá se z `Date.now()` od posledního střídání nebo startu půle. Po vypršení se pruh zvýrazní, Android zavibruje (`navigator.vibrate`), iOS jen barva. Žádný dialog, žádný zvuk.
- **Návrh rotace:** tolik dvojic, kolik je hráčů na lavičce. Hráč z lavičky s nejméně minutami jde za hráče na hřišti s nejvíce minutami na kompatibilním postu. Kompatibilita v pořadí: stejná role → stejná skupina (`ROLE_GROUP`: křídlo a střeďák jsou `MID`) → kdokoli mimo brankáře.
- **Úprava návrhu tapem:** tap na odcházejícího hráče v dvojici přepne na dalšího kompatibilního hráče na hřišti (záložník ↔ střeďák jedním tapem). Dvojici jde vyhodit.
- **Provést:** jedno tlačítko zapíše všechny `SUB` eventy se stejným `at`. „Vzít zpět“ vrátí celou dávku. Ruční střídání (tap hřiště → tap lavička) zůstává a resetuje odpočet.

## Kritické mobilní detaily – jak jsou vyřešené

1. **Čas z `Date.now()`, ne z tiků.** Do `Match.events` se ukládají absolutní časy (`at = Date.now()`). Odehraný čas půle = součet segmentů `PERIOD_START…PERIOD_END` (resp. `…now`). `useNow` má `setInterval(…, 1000)`, který jen vyvolá re-render – v intervalu se nic nesčítá – a navíc překreslí okamžitě při `visibilitychange`/`focus`, aby po odemknutí telefonu čas naskočil hned, ne až za sekundu. Vše v `lib/minutes.ts`: `computeMinutes(match, now)`, `periodElapsedSec`, `clockState`. ✅
2. **Obnova po zabití appky.** Veškerý stav zápasu včetně eventů je v `localStorage` hned po každé mutaci (zustand persist bez debounce), stejně jako aktivní tab a zápas. Po restartu se z eventů dopočítá stav – běžící půle je „period bez `PERIOD_END`“. Ověřeno: 5 střídání, posun všech eventů o 3 minuty do minulosti (simulace zamčeného telefonu) a hard reload → hodiny i minuty hráčů ukazují správný, o 3 minuty vyšší čas, appka se otevře na Live. ✅
3. **Wake Lock.** `hooks/useWakeLock.ts`: `navigator.wakeLock.request('screen')` když existuje (Android Chrome), re-request při `visibilitychange`, release při odchodu z Live. Když API není (iOS Safari), na Live je jednou nenápadný řádek „Displej může zhasnout, čas běží dál“, tapem zmizí a uloží se `settings.wakeLockNoticeShown`. Žádné skryté video – díky bodu 1 je zhasnutý displej neškodný. ✅
4. **`100dvh` + safe area.** `html, body, #root { height: 100dvh }`; viewport má `viewport-fit=cover`; tab bar má `padding-bottom: env(safe-area-inset-bottom)` (třída `.safe-bottom`), obsah `.safe-top`. ✅ fáze 1
5. **Tap targety 48×48, mezery 8 px.** Utility třída `.tap` (`min-width/height: 48px`) na každém tlačítku a řádku; mezery řešené `gap-2` (8 px) a víc. ✅ fáze 1 (tab bar, seznam kádru)
6. **Žádný hover jako nositel informace.** V CSS nepoužíváme `hover:` varianty pro stav; výběr hráče/slotu je vždy vykreslený trvale (barva, obrys). ✅ pravidlo pro všechny fáze
7. **Double-tap zoom a text selection.** Třída `.no-touch-fx` = `touch-action: manipulation; user-select: none; -webkit-touch-callout: none`. Je na tab baru, na SVG hřišti i na lavičce (ta má navíc `touch-action: pan-x`, aby šla scrollovat, ale nezoomovala). `.tap` má navíc `touch-action: manipulation` a vypnutý `-webkit-tap-highlight-color`. ✅ fáze 1
8. **Kontrast na slunci.** Podklad `#f4f4f0`, text `#17201b` (kontrast > 15:1). Hřiště `#2f6b45` s bílými čarami – tmavší a méně sytá než trávová zelená. Sytá barva (`#d9480f`) jen jako akcent pro vybraný prvek / varování. Žádný dark mode. ✅ fáze 1
9. **Portrait only.** `orientation: 'portrait'` v manifestu, `display: 'standalone'`. ✅ fáze 1
10. **Animace ≤ 150 ms.** V editoru sestavy nejsou žádné CSS přechody (změna výběru je okamžitá překreslením), `DragOverlay` má `dropAnimation={null}`. ✅ fáze 4

## Stav podle fází

- [x] 1. Scaffold, PWA, persist, seed, 4 taby. Ověřeno: SW aktivní, 15 souborů v precache, appka se načte se zastaveným serverem, žádný request mimo vlastní origin.
- [x] 2. `computeMinutes` + 11 testů (střídání v půli, nástup ve 2. půli, dvojité střídání ve stejnou sekundu, běžící zápas, pauza, restart, undo dávky, neseřazené eventy).
- [x] 3. Kádr (minuty za sezónu, řazení podle jména/minut, přidat/upravit/deaktivovat, více rolí) + Nastavení (defaulty, export, import s náhledem, smazání dat). Ověřeno: export → smazat → import = identický `localStorage`.
- [x] 4. Formace (5 seedových + vlastní) + editor sestavy: SVG hřiště, tap interakce, návrhy na lavičce, uložené sestavy (uložit, načíst, duplikovat, přejmenovat, smazat), dnd-kit navrch. Ověřeno: kompletní 7+1 výhradně tapy, prohození, přesun, odebrání, změna formace bez ztráty hráče, reload zachová draft, drag lavička→slot, slot→slot i slot→lavička.
- [x] 5. Zápas: seznam, nový zápas (soupeř, datum, délka půle, počet půlí, rotace), docházka dlaždicemi s počítadlem a varováním < 8, načtení šablony s označením chybějících, zápasová kopie sestavy, editor v zápasovém režimu. Ověřeno: šablona netknutá, chybějící označení v detailu i v editoru, lavička jen z přítomných, reload vrátí na detail zápasu.
- [x] 6. Live: zahájení, čas půle z `Date.now()`, pauza/konec půle/další půle, střídání dvěma tapy s toastem a undo dávky, minuty u všech, lavička podle minut s označením podhraných, rotace s odpočtem a návrhem dvojic po postech, Vytížení, konec zápasu → sezónní součet, wake lock. Ověřeno: 5 střídání + undo, hard reload s posunem 3 min, rotace 4 hráčů jednou dávkou, pauza zamrazí čas, 2. půle od 00:00, po konci minuty na Kádru.

## Akceptační kritéria

- [x] Sestavím kompletní 7+1 sestavu z 15 hráčů výhradně tapy (ověřeno syntetickými tapy, bez dragu).
- [x] Uložím sestavu, zavřu appku, znovu otevřu – sestava je tam (reload s persistovaným draftem i uloženou sestavou).
- [x] Rozehraju zápas, 5 střídání, hard reload – čas i minuty správné, zápas pokračuje.
- [x] Vezmu zpět špatné střídání a minuty se srovnají (undo maže poslední dávku eventů, součty jsou vždy dopočítané).
- [x] Zamknu telefon na 3 minuty – simulováno posunem `at` všech eventů o 180 s a reloadem: hodiny 04:17, hráč na hřišti 04:17.
- [x] Export → smazat data → import – `localStorage` identický.
- [x] Nikde v runtime nejde request na síť – Network tab ukazuje jen vlastní origin.
- [ ] Instalace na plochu iOS i Android a start v letadlovém režimu – offline start ověřen zastavením serveru v desktopovém Chromiu; na reálném telefonu vyžaduje HTTPS (GitHub Pages), to je na tobě.
- [ ] Dotykové gesta (drag, scroll lavičky, zoom) – vestavěný prohlížeč neumí reálné dotyky, ověř na telefonu.
