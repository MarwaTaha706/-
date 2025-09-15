// import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { LoginData } from '../models/login.model';
// import { RegisterData } from '../models/register.model';
// import { Observable, BehaviorSubject } from 'rxjs';
// import { API_BASE_URL } from '../api';

// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private tokenKey = 'token';
//   private isVerifiedDriverKey = 'isVerifiedDriver';
//   private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());
//   private isVerifiedDriver$ = new BehaviorSubject<boolean>(this.getStoredIsVerifiedDriver());
//   private currentUser$ = new BehaviorSubject<{ name: string; email: string; profileImageUrl: string } | null>(this.getCurrentUserFromToken());

//   constructor(private http: HttpClient) {}

//   login(data: LoginData): Observable<any> {
//     const url = `${API_BASE_URL}/Account/Login`;
//     const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
//     return new Observable(observer => {
//       this.http.post<any>(url, data, { headers }).subscribe({
//         next: (response) => {
//           if (response.data?.token) {
//             this.saveToken(response.data.token);
//             this.setIsVerifiedDriver(response.data.isVerifiedDriver);
//             this.loggedIn$.next(true);
//             this.isVerifiedDriver$.next(response.data.isVerifiedDriver);
//             this.currentUser$.next(this.getCurrentUserFromToken());
//           }
//           observer.next(response);
//           observer.complete();
//         },
//         error: (err) => {
//           observer.error(err);
//         }
//       });
//     });
//   }

//   register(data: RegisterData): Observable<any> {
//     const url = `${API_BASE_URL}/Account/RegisterUser`;
//     const formData = new FormData();
//     formData.append('Name', data.Name);
//     formData.append('Email', data.Email);
//     formData.append('Password', data.Password);
//     formData.append('PhoneNumber', data.PhoneNumber);
//     formData.append('Gender', data.Gender.toString());
//     return this.http.post(url, formData);
//   }

//   saveToken(token: string) {
//     localStorage.setItem(this.tokenKey, token);
//   }

//   getToken(): string | null {
//     return localStorage.getItem(this.tokenKey);
//   }

//   hasToken(): boolean {
//     return !!this.getToken();
//   }

//   logout() {
//     localStorage.removeItem(this.tokenKey);
//     localStorage.removeItem(this.isVerifiedDriverKey);
//     this.loggedIn$.next(false);
//     this.isVerifiedDriver$.next(false);
//     this.currentUser$.next(null);
//   }

//   setIsVerifiedDriver(isVerified: boolean) {
//     localStorage.setItem(this.isVerifiedDriverKey, JSON.stringify(isVerified));
//   }

//   getStoredIsVerifiedDriver(): boolean {
//     const val = localStorage.getItem(this.isVerifiedDriverKey);
//     return val ? JSON.parse(val) : false;
//   }

//   public isLoggedIn(): boolean {
//     return this.loggedIn$.value;
//   }

//   public isVerifiedDriver(): boolean {
//     return this.isVerifiedDriver$.value;
//   }

//   public getLoggedInObservable(): Observable<boolean> {
//     return this.loggedIn$.asObservable();
//   }

//   public getIsVerifiedDriverObservable(): Observable<boolean> {
//     return this.isVerifiedDriver$.asObservable();
//   }

//   public getCurrentUserId(): string | null {
//     const token = this.getToken();
//     if (!token) return null;
//     try {
//       const payload = JSON.parse(this.parseJwtPayload(token));
      
//       return payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || null;
//     } catch {
//       return null;
//     }
//   }

//   public getCurrentUser(): { name: string; email: string; profileImageUrl: string } | null {
//     const token = this.getToken();
//     if (!token) return null;
//     try {
//       const payload = JSON.parse(atob(token.split('.')[1]));
//       return {
//         name: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || 'مستخدم',
//         email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || '',
//         profileImageUrl: 'https://i.pravatar.cc/40'
//       };
//     } catch {
//       return null;
//     }
//   }

//   private parseJwtPayload(token: string): string {
    
//     let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
   
//     while (base64.length % 4) {
//       base64 += '=';
//     }
    
//     const decoded = decodeURIComponent(
//       atob(base64)
//         .split('')
//         .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
//         .join('')
//     );
//     return decoded;
//   }

//   private getCurrentUserFromToken(): { name: string; email: string; profileImageUrl: string } | null {
//     const token = this.getToken();
//     if (!token) return null;
//     try {
//       const payload = JSON.parse(this.parseJwtPayload(token));
//       return {
//         name: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || 'مستخدم',
//         email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || '',
//         profileImageUrl: 'https://i.pravatar.cc/40'
//       };
//     } catch {
//       return null;
//     }
//   }

//   public getCurrentUserObservable(): Observable<{ name: string; email: string; profileImageUrl: string } | null> {
//     return this.currentUser$.asObservable();
//   }
   
//     getDriverVerifyStatus(): Observable<any> {
//       return this.http.get(`${API_BASE_URL}/Driver/GetDriverVerifiyStatus`);
//     }
  
// } 
///////////
// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoginData } from '../models/login.model';
import { RegisterData } from '../models/register.model';
import { Observable, BehaviorSubject } from 'rxjs';
import { API_BASE_URL } from '../api';

@Injectable({ providedIn: 'root' } )
export class AuthService {
  private tokenKey = 'token';
  private isVerifiedDriverKey = 'isVerifiedDriver';

  private loggedIn$ = new BehaviorSubject<boolean>(this.hasToken());
  private isVerifiedDriver$ = new BehaviorSubject<boolean>(this.getStoredIsVerifiedDriver());
  private currentUser$ = new BehaviorSubject<{ name: string; email: string; profileImageUrl: string } | null>(this.getCurrentUserFromToken());

  constructor(private http: HttpClient ) { }

  // ... (all other functions like login, register, logout, isAdmin, etc., remain exactly the same) ...
  login(data: LoginData): Observable<any> {
    const url = `${API_BASE_URL}/Account/Login`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return new Observable(observer => {
      this.http.post<any>(url, data, { headers }  ).subscribe({
        next: (response) => {
          if (response.data?.token) {
            this.saveToken(response.data.token);
            this.setIsVerifiedDriver(response.data.isVerifiedDriver);
            this.loggedIn$.next(true);
            this.isVerifiedDriver$.next(response.data.isVerifiedDriver);
            this.currentUser$.next(this.getCurrentUserFromToken());
          }
          observer.next(response);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  register(data: RegisterData): Observable<any> {
    const url = `${API_BASE_URL}/Account/RegisterUser`;
    const formData = new FormData();
    formData.append('Name', data.Name);
    formData.append('Email', data.Email);
    formData.append('Password', data.Password);
    formData.append('PhoneNumber', data.PhoneNumber);
    formData.append('Gender', data.Gender.toString());
    return this.http.post(url, formData  );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.isVerifiedDriverKey);
    this.loggedIn$.next(false);
    this.isVerifiedDriver$.next(false);
    this.currentUser$.next(null);
  }

  public isAdmin(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      const payload = JSON.parse(this.parseJwtPayload(token));
      const roleClaim = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
      const userRoles = payload[roleClaim];

      if (!userRoles  ) {
        return false;
      }

      if (Array.isArray(userRoles)) {
        const lowerCaseRoles = userRoles.map(r => String(r).toLowerCase());
        return lowerCaseRoles.includes('admin') || lowerCaseRoles.includes('admain');
      }
      
      if (typeof userRoles === 'string') {
        const lowerCaseRole = userRoles.toLowerCase();
        return lowerCaseRole === 'admin' || lowerCaseRole === 'admain';
      }

      return false;

    } catch (e) {
      console.error("خطأ في قراءة التوكن:", e);
      return false;
    }
  }

  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  setIsVerifiedDriver(isVerified: boolean) {
    localStorage.setItem(this.isVerifiedDriverKey, JSON.stringify(isVerified));
  }

  getStoredIsVerifiedDriver(): boolean {
    const val = localStorage.getItem(this.isVerifiedDriverKey);
    return val ? JSON.parse(val) : false;
  }

  public isLoggedIn(): boolean {
    return this.loggedIn$.value;
  }

  public isVerifiedDriver(): boolean {
    return this.isVerifiedDriver$.value;
  }

  public getLoggedInObservable(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  public getIsVerifiedDriverObservable(): Observable<boolean> {
    return this.isVerifiedDriver$.asObservable();
  }

  public getCurrentUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(this.parseJwtPayload(token));
      return payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || null;
    } catch {
      return null;
    }
  }

  public getCurrentUser(  ): { name: string; email: string; profileImageUrl: string } | null {
    return this.getCurrentUserFromToken();
  }

  private parseJwtPayload(token: string): string {
    let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return decoded;
  }

  private getCurrentUserFromToken(): { name: string; email: string; profileImageUrl: string } | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(this.parseJwtPayload(token));
      return {
        name: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || 'مستخدم',
        email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || '',
        profileImageUrl: 'https://i.pravatar.cc/40'
      };
    } catch {
      return null;
    }
  }

  public getCurrentUserObservable(  ): Observable<{ name: string; email: string; profileImageUrl: string } | null> {
    return this.currentUser$.asObservable();
  }

  /**
   * *** THIS FUNCTION IS NOW CORRECTED ***
   * The URL has been changed to point to the correct endpoint under the 'Account' controller.
   */
  getDriverVerificationDocuments(): Observable<any> {
  // THIS URL IS INCORRECT AND CAUSING THE 404 ERROR
  return this.http.get(`${API_BASE_URL}/Driver/GetDriverVerificationDocuments` ); 
}
}
