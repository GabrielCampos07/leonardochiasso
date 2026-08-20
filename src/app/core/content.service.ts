import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ART_SERIES, ArtSeries } from './arte.data';
import { JOIAS_PIECES, JoiaPiece } from './joias.data';
import { ARTCOUTURE_WEARERS, ArtCoutureWearer } from '../pages/alta-costura/artcouture-wearers.data';
import { LOOKBOOKS, LookbookCollection } from '../pages/alta-costura/lookbook.data';
import { ALTA_DESFILES, AltaDesfileShow } from '../pages/alta-costura/alta-costura.data';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');

  readonly joias = signal<JoiaPiece[]>(JOIAS_PIECES);
  readonly arteSeries = signal<ArtSeries[]>(ART_SERIES);
  readonly wearers = signal<ArtCoutureWearer[]>(ARTCOUTURE_WEARERS);
  readonly lookbooks = signal<LookbookCollection[]>(LOOKBOOKS);
  readonly desfiles = signal<AltaDesfileShow[]>(ALTA_DESFILES);

  private useApi(): boolean {
    return Boolean(this.baseUrl) && !environment.demoMode;
  }

  loadJoias(): Observable<JoiaPiece[]> {
    return this.fetchList<JoiaPiece>('/api/joias', JOIAS_PIECES, this.joias);
  }

  loadArte(): Observable<ArtSeries[]> {
    return this.fetchList<ArtSeries>('/api/arte', ART_SERIES, this.arteSeries);
  }

  loadWearers(): Observable<ArtCoutureWearer[]> {
    return this.http
      .get<Array<ArtCoutureWearer & { id?: string }>>(`${this.baseUrl}/api/alta-costura/wearers`)
      .pipe(
        map((rows) => (rows?.length ? rows : ARTCOUTURE_WEARERS)),
        tap((list) => this.wearers.set(list)),
        catchError(() => {
          this.wearers.set(ARTCOUTURE_WEARERS);
          return of(ARTCOUTURE_WEARERS);
        }),
      );
  }

  getLookbook(slug: string): Observable<LookbookCollection | undefined> {
    if (!this.useApi()) {
      return of(LOOKBOOKS.find((l) => l.slug === slug));
    }
    return this.http.get<LookbookCollection>(`${this.baseUrl}/api/lookbooks/${slug}`).pipe(
      catchError(() => of(LOOKBOOKS.find((l) => l.slug === slug))),
    );
  }

  getDesfile(slug: string): Observable<AltaDesfileShow | undefined> {
    if (!this.useApi()) {
      return of(ALTA_DESFILES.find((d) => d.slug === slug));
    }
    return this.http.get<AltaDesfileShow>(`${this.baseUrl}/api/desfiles/${slug}`).pipe(
      catchError(() => of(ALTA_DESFILES.find((d) => d.slug === slug))),
    );
  }

  patchContent(kind: string, slug: string, path: string, value: unknown): Observable<unknown> {
    if (!this.useApi()) return of(null);
    return this.http.patch(
      `${this.baseUrl}/api/admin/content/${kind}/${slug}`,
      { path, value },
      { withCredentials: true },
    );
  }

  private fetchList<T>(
    path: string,
    fallback: T[],
    target: ReturnType<typeof signal<T[]>>,
  ): Observable<T[]> {
    if (!this.useApi()) {
      target.set(fallback);
      return of(fallback);
    }
    return this.http.get<T[]>(`${this.baseUrl}${path}`).pipe(
      map((rows) => (rows?.length ? rows : fallback)),
      tap((list) => target.set(list)),
      catchError(() => {
        target.set(fallback);
        return of(fallback);
      }),
    );
  }
}
