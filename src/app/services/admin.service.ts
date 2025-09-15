// src/app/services/admin.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api'; // Assuming you have this constant defined for your API's base URL

@Injectable({
  providedIn: 'root'
} )
export class AdminService {
  private readonly adminApiUrl = `${API_BASE_URL}/Admin`;

  constructor(private http: HttpClient ) { }

  /**
   * Fetches a paginated list of all passengers.
   * Can optionally filter the results based on a search query.
   * @param page - The page number to retrieve.
   * @param pageSize - The number of items per page.
   * @param searchQuery - (Optional) The term to search for (e.g., name or email).
   * @returns An Observable with the paginated list of passengers.
   */
  getAllPassengers(page: number, pageSize: number, searchQuery?: string): Observable<any> {
    // Start by creating HttpParams with the required pagination parameters.
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    // If a search query is provided and is not just empty whitespace,
    // add it to the request parameters.
    // Note: The backend API must be configured to recognize the 'search' parameter.
    // If your API uses a different name (e.g., 'query', 'filter'), change it here.
    if (searchQuery && searchQuery.trim() !== '') {
      params = params.set('search', searchQuery);
    }

    // Perform the GET request to the backend with the constructed parameters.
    return this.http.get(`${this.adminApiUrl}/GetAllPassengers`, { params } );
  }

  /**
   * Fetches a paginated list of all drivers.
   * @param page - The page number to retrieve.
   * @param pageSize - The number of items per page.
   * @returns An Observable with the paginated list of drivers.
   */
  getAllDrivers(page: number, pageSize: number): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get(`${this.adminApiUrl}/GetAllDrivers`, { params } );
  }

  /**
   * Fetches the detailed profile of a specific driver by their ID.
   * @param driverId - The unique identifier of the driver.
   * @returns An Observable with the driver's details.
   */
  getDriverDetailsById(driverId: string): Observable<any> {
    const params = new HttpParams().set('DriverId', driverId);
    return this.http.get(`${this.adminApiUrl}/GetDriverDetailsById`, { params } );
  }

  /**
   * Sends a request to verify a driver's profile.
   * @param driverId - The unique identifier of the driver to verify.
   * @returns An Observable confirming the action.
   */
  verifyDriverById(driverId: string): Observable<any> {
    const params = new HttpParams().set('Id', driverId);
    return this.http.put(`${this.adminApiUrl}/VerifyDriverById`, null, { params } );
  }

  /**
   * Sends a request to verify a specific document.
   * @param documentId - The unique identifier of the document to verify.
   * @returns An Observable confirming the action.
   */
  verifyDocumentById(documentId: string): Observable<any> {
    const params = new HttpParams().set('Id', documentId);
    return this.http.put(`${this.adminApiUrl}/VerifyDocumentById`, null, { params } );
  }
}
