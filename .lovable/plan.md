

# Plan: Pregled i poboljšanje aplikacije

## Trenutno stanje

Pregledao sam kompletnu aplikaciju — **nema grešaka** u konzoli, nema neuspešnih mrežnih zahteva, kod je funkcionalan. Aplikacija radi kako treba.

## Identifikovani potencijalni problemi za poboljšanje

### 1. Duplirane real-time pretplate za vožnje
`DispatcherLayout.tsx` i `Dashboard.tsx` oba slušaju promene na `rides` tabeli i prikazuju toast obaveštenja — to može dovesti do **duplih notifikacija** kada je korisnik na Dashboard stranici.

**Popravka:** Ukloniti ride notification logiku iz `DispatcherLayout.tsx` jer `Dashboard.tsx` već ima detaljniju verziju sa zvučnim efektima.

### 2. Auth — getSession pre onAuthStateChange
U `auth.tsx`, `getSession()` se poziva nakon `onAuthStateChange` što je ispravno, ali `fetchRole` koristi `setTimeout` koji može izazvati race condition pri brzim promenama sesije.

**Popravka:** Dodati čist async flow bez `setTimeout` koristeći direktan `await` u callback-u.

### 3. History stranica — nedostaje ime vozača
U `History.tsx`, prikazuje se samo `assigned_driver_id` ali ne i ime vozača — korisnik ne vidi ko je vozio.

**Popravka:** Dodati join sa `profiles` tabelom da se prikaže ime vozača.

### 4. Rides panel na mobilnom — previše mali
Na Dashboard-u, rides panel je fiksiran na `w-[360px]` što je problematično na manjim ekranima.

**Popravka:** Na mobilnom prikazati rides panel kao full-width na dnu ekrana.

### 5. Missing error handling na upsert lokacije
U `DriverDashboard.tsx`, `vehicle_locations.upsert` nema error handling — tihi neuspeh GPS praćenja.

**Popravka:** Dodati `.then` error check.

## Plan implementacije

1. **Ukloniti duple ride notifikacije** iz `DispatcherLayout.tsx` (ostaviti samo u `Dashboard.tsx`)
2. **Popraviti auth race condition** u `auth.tsx`
3. **Dodati ime vozača u History** stranicu
4. **Responsivan rides panel** na Dashboard-u za mobilne uređaje
5. **Error handling za GPS upsert** u `DriverDashboard.tsx`

## Tehnički detalji

- `DispatcherLayout.tsx`: Ukloniti `useEffect` sa `supabase.channel("dispatcher-ride-notifications")` (linije 30-63) i `prevRidesRef`
- `auth.tsx`: Zameniti `setTimeout(() => fetchRole(...), 0)` sa direktnim pozivom `fetchRole()`
- `History.tsx`: Fetch profila vozača i mapiranje imena
- `Dashboard.tsx`: Dodati responsive klase za rides panel (`w-full lg:w-[360px]`, pozicija na mobilnom)
- `DriverDashboard.tsx`: Dodati `.catch()` na upsert poziv

