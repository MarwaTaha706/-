import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UrlTransformerService {
  // Define the single source of truth for your backend URL
  private readonly API_BASE_URL = 'http://me4war.runasp.net';

  constructor( ) { }

  /**
   * Transforms a relative API path into a full, absolute URL.
   * This is the centralized version of the working `getFullImageUrl` function.
   * @param relativeUrl The path from the API (e.g., "/uploads/image.jpg")
   * @returns The full URL or a default placeholder image.
   */
  public toAbsoluteUrl(relativeUrl: string | null | undefined): string {
    const defaultImage = 'default-user.png'; // A local default image

    // 1. If the URL is null or empty, return the default placeholder.
    if (!relativeUrl) {
      return defaultImage;
    }

    // 2. If it's already a full URL (starts with http ) or a local preview (starts with blob), use it directly.
    if (relativeUrl.startsWith('http' ) || relativeUrl.startsWith('blob')) {
      return relativeUrl;
    }

    // 3. This is the crucial part: Prepend the API_BASE_URL to the relative path.
    return this.API_BASE_URL + relativeUrl;
  }
}
