import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from '../api';

@Injectable({ providedIn: 'root' } )
export class ProfileService {
  constructor(private http: HttpClient ) {}

  // --- Driver Methods ---
  getDriverProfile(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/Driver/GetDriverProfile` );
  }

  getDriverHistoryTrips(page: number = 1, size: number = 10): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size);
    return this.http.get(`${API_BASE_URL}/Driver/GetDriverHistoryTrips`, { params } );
  }

  getDriverCurrentTrips(page: number = 1, size: number = 10): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size);
    return this.http.get(`${API_BASE_URL}/Driver/GetDriverCurrentTrips`, { params } );
  }

  getDriverVerificationDocuments(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/Driver/GetDriverVerificationDocuments` );
  }

  getDriverVehicleDetails(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/Driver/GetDriverVehicleDetails` );
  }

  editDriverProfile(data: { driverName: string; phoneNumber: string; description: string; profileImage?: File }): Observable<any> {
    const formData = new FormData();
    formData.append('DriverName', data.driverName);
    formData.append('PhoneNumber', data.phoneNumber);
    formData.append('Description', data.description);
    if (data.profileImage) {
      formData.append('ProfileImage', data.profileImage);
    }
    return this.http.put(`${API_BASE_URL}/Driver/EditDriverProfile`, formData );
  }

  updateDriverVehicleDetails(data: any): Observable<any> {
    const formData = new FormData();
    formData.append('Id', data.Id);
    formData.append('DriverId', data.DriverId);
    formData.append('Model', data.Model);
    formData.append('Color', data.Color);
    formData.append('PlateNumber', data.PlateNumber);
    formData.append('SeatsNumber', data.SeatsNumber);
    formData.append('Description', data.Description);
    if (data.VehicleImageUrls && data.VehicleImageUrls.length) {
      for (let file of data.VehicleImageUrls) {
        formData.append('VehicleImageUrls', file);
      }
    }
    return this.http.put(`${API_BASE_URL}/Driver/UpdateVehicleDetails`, formData );
  }

  // --- Passenger Methods ---
  getPassengerProfile(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/Passenger/GetPassengerProfile` );
  }

  // ✅✅✅ NEW: Added Passenger Trip Endpoints ✅✅✅
  getPassengerHistoryTrips(page: number = 1, size: number = 10): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size);
    return this.http.get(`${API_BASE_URL}/Passenger/GetPassengerHistoryTrips`, { params } );
  }

  getPassengerCurrentTrips(page: number = 1, size: number = 10): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size);
    return this.http.get(`${API_BASE_URL}/Passenger/GetPassengerCurrentTrips`, { params } );
  }

  updatePassengerProfile(data: { Name: string; PhoneNumber: string; ProfileImage?: File }): Observable<any> {
    const formData = new FormData();
    formData.append('Name', data.Name);
    formData.append('PhoneNumber', data.PhoneNumber);
    if (data.ProfileImage) {
      formData.append('ProfileImage', data.ProfileImage);
    }
    return this.http.put(`${API_BASE_URL}/Passenger/UpdatePassengerProfile`, formData );
  }


}
