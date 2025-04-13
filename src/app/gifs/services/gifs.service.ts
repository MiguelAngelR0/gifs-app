import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import type { GiphyResponse } from '../interfaces/giphy.interfaces';
import { Gif } from '../interfaces/gif.interface';
import { GifMapper } from '../mapper/gif.mapper';
import { map, Observable, tap } from 'rxjs';

const GIF_KEY = 'gifs';

const loadFromLocalStorage = () => {
  //Si no tiene nada regreso un strin vacio, por lo que ahora siempre regreso algo
  const gifsFromLocalStorage = localStorage.getItem(GIF_KEY) ?? '{}'; //Record<string, gifs[]>
  const gifs = JSON.parse(gifsFromLocalStorage);
  console.log(gifs)
  return gifs
}

// {
//   'goku': [gif1,gif2,...],
//   'saitama':[gif,gif4],
//   'dragon': [getLocaleId,...]
// }
// Record<string, Gif[]>

@Injectable({providedIn: 'root'})
export class GifService {
  private http = inject(HttpClient);

  trendingGifs = signal<Gif[]>([]);
  trendingGifsLoading = signal(true);

  searchHistory = signal<Record<string, Gif[]>>(loadFromLocalStorage());
  searchHistoryKeys = computed(() => Object.keys(this.searchHistory()));


  constructor() {
    this.loadTrendingGifs();
  }

  saveGifsToLocalStorage = effect(() => {
    const history = JSON.stringify(this.searchHistory());
    localStorage.setItem('gifs',history)
  })

  loadTrendingGifs() {

    this.http.get<GiphyResponse>(`${environment.giphyUrl}/gifs/trending`, {
      params: {
        api_key: environment.giphyApiKey,
        limit: '20',
      }

    }).subscribe((resp) => {
      const gifs = GifMapper.mapGiphyItemsToGifArray(resp.data);
      this.trendingGifs.set(gifs);
      this.trendingGifsLoading.set(false);
    })
  }

  searchGifs(query: string): Observable<Gif[]>{
    return this.http.get<GiphyResponse>(`${environment.giphyUrl}/gifs/search`, {
      params: {
        api_key: environment.giphyApiKey,
        limit: '20',
        q: query
      }
    }).pipe(
      map(({data}) => data),
      map((items) => GifMapper.mapGiphyItemsToGifArray(items)),


      //todo manejar historial
      tap(items =>{
        this.searchHistory.update(history => ({
          ...history,
          [query.toLowerCase()]: items
        }));
      })
    );

    //Regresar un observable
    // .subscribe((resp) => {
    //   const gifs = GifMapper.mapGiphyItemsToGifArray(resp.data);
    //   console.log(gifs);
    // })
  }

  getHistoryGifs(query:string):Gif[] {
    return this.searchHistory()[query] ?? [];

  }

}
