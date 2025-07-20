import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api';
import { BooleanResponse, StringResponse, RegisterDriverRequest } from '../models/register.model';

@Injectable({ providedIn: 'root' })
export class RegisterDriverService {
  constructor(private http: HttpClient) {}

  registerDriver(payload: FormData): Observable<BooleanResponse> {
    return this.http.post<BooleanResponse>(
      `${API_BASE_URL}/Account/RegisterDriver`,
      payload
    );
  }

  /**
   * يجلب رابط صورة الملف الشخصي للمستخدم الحالي.
   */
  getCurrentUserProfileImageURL(): Observable<StringResponse> {
    return this.http.get<StringResponse>(
      `${API_BASE_URL}/GetCurrentUserProfileImageURL`
    );
  }

  // uploadDocuments(payload: FormData): Observable<BooleanResponse> {
  //   return this.http.post<BooleanResponse>(
  //     `${API_BASE_URL}/Account/UploadDocuments`,
  //     payload
  //   );
  // }
}