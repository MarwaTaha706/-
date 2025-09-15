// In src/app/services/register-driver.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api';
import { BooleanResponse } from '../models/register.model';

@Injectable({ providedIn: 'root' } )
export class RegisterDriverService {
  constructor(private http: HttpClient ) {}

  /**
   * This is now the ONLY method needed.
   * It sends all driver and document information in a single request.
   */
  registerDriver(payload: FormData): Observable<BooleanResponse> {
    return this.http.post<BooleanResponse>(
      `${API_BASE_URL}/Account/RegisterDriver`,
      payload
     );
  }

  // The uploadDocuments method is no longer needed and can be removed.
  /*
  uploadDocuments(payload: FormData): Observable<BooleanResponse> {
    return this.http.post<BooleanResponse>(
      `${API_BASE_URL}/Account/UploadDocuments`,
      payload
     );
  }
  */
}
