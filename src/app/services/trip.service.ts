import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Trip } from '../models/trip.model';
import { CreateTripRequest } from '../models/trip.model';
import { API_BASE_URL } from '../api';
import { TripCard } from '../models/trip.model';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  constructor(private http: HttpClient) { }

  getTripsByLocation(departureCity: string, destinationCity: string, departureDate?: string, pageNumber: number = 1, pageSize: number = 10): Observable<any> {
    const params: any = {
      DepartureCity: departureCity,
      DestinationCity: destinationCity,
      PageNumber: pageNumber,
      PageSize: pageSize
    };
    if (departureDate) {
      params.DepartureDate = departureDate;
    }
    return this.http.get<any>(`${API_BASE_URL}/Trip/GetAllTrips`, { params });
  }

  // getTripById(id: string): Observable<Trip> {
  //   return this.http.get<Trip>(`${this.apiUrl}/trips/${id}`).pipe(
  //     catchError(error => {
  //       console.error('Error fetching trip:', error);
  //       throw error;
  //     })
  //   );
  // }

  createTrip(payload: CreateTripRequest): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/Trip/CreateTrip`, payload);
  }

  getAllTrips(pageNumber: number = 1, pageSize: number = 10): Observable<any> {
    const params = {
      PageNumber: pageNumber,
      PageSize: pageSize
    };
    return this.http.get<any>(`${API_BASE_URL}/Trip/GetAllTrips`, { params });
  }

  getTripById(id: string) {
    return this.http.get<any>(`${API_BASE_URL}/Trip/GetTripById/${id}`);
  }

  bookRide(tripId: string, seatsBooked: number, totalPrice: number): Observable<any> {
    return this.http.post<any>(
      `${API_BASE_URL}/Booking/CreateBooking`,
      {
        tripId,
        seatsBooked,
        totalPrice
      }
    );
  }
} 