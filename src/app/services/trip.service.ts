import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateTripRequest } from '../models/trip.model';
import { API_BASE_URL } from '../api';
export interface CreateReviewPayload {
  tripId: string;
  reviewerId: string;
  revieweeId: string;
  rate: number;
  comment?: string; // Comment is optional
}
@Injectable({
  providedIn: 'root'
} )
export class TripService {
  constructor(private http: HttpClient ) { }

  // --- All other methods are correct and remain unchanged ---
  getAllTrips(
    pageNumber: number = 1,
    pageSize: number = 10,
    departureCity?: string,
    destinationCity?: string,
    departureDate?: string,
    gender?: string,
    tripStatus?: number
  ): Observable<any> {
    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString())
      .set('PageSize', pageSize.toString());

    if (departureCity) { params = params.set('DepartureCity', departureCity); }
    if (destinationCity) { params = params.set('DestinationCity', destinationCity); }
    if (departureDate) {
      const formattedDate = new Date(departureDate).toISOString().split('T')[0];
      params = params.set('DepartureDate', formattedDate);
    }
    if (gender) { params = params.set('DriverGender', gender); }
    // ✅ FIX: Added logic to use the new optional parameter
    if (tripStatus !== undefined && tripStatus !== null) {
      params = params.set('TripStatus', tripStatus.toString());
    }


    return this.http.get<any>(`${API_BASE_URL}/Trip/GetAllTrips`, { params } );
  }

  createTrip(payload: CreateTripRequest): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/Trip/CreateTrip`, payload );
  }

  getTripById(id: string): Observable<any> {
    return this.http.get<any>(`${API_BASE_URL}/Trip/GetTripById/${id}` );
  }

  startTrip(tripId: string): Observable<any> {
    const url = `${API_BASE_URL}/Trip/StartTrip/${tripId}`;
    const body = {
      tripId: tripId
    };
    return this.http.put(url, body );
  }

  updateTrip(tripId: string, seatsAvailable: number): Observable<any> {
    const url = `${API_BASE_URL}/Trip/UpdateTrip/${tripId}`;
    const body = { tripId: tripId, seatsAvailable: seatsAvailable };
    return this.http.put(url, body );
  }

  deleteTrip(tripId: string): Observable<any> {
    const url = `${API_BASE_URL}/Trip/CancelTrip`;
    const body = { tripId: tripId };
    return this.http.put(url, body );
  }

  bookRide(tripId: string, seats: number, totalPrice: number): Observable<any> {
    const url = `${API_BASE_URL}/Booking/CreateBooking`;
    const body = {
      tripId: tripId,
      seatsBooked: seats,
      totalPrice: totalPrice
    };
    return this.http.post<any>(url, body );
  }

  getPendingBookings(tripId: string): Observable<any> {
    const url = `${API_BASE_URL}/Booking/GetPendingBookings/${tripId}`;
    return this.http.get<any>(url );
  }

  getBookingById(bookingId: string): Observable<any> {
    const url = `${API_BASE_URL}/Booking/GetBookingById/${bookingId}`;
    return this.http.get<any>(url );
  }

  acceptBooking(bookingId: string): Observable<any> {
    const url = `${API_BASE_URL}/Booking/AcceptBookingRequest`;
    const body = { bookingId: bookingId };
    return this.http.put<any>(url, body );
  }

  cancelBookingByDriver(bookingId: string, tripId: string): Observable<any> {
    const url = `${API_BASE_URL}/Booking/CancelBookingByDriver`;
    let params = new HttpParams()
      .set('bookingId', bookingId)
      .set('tripId', tripId);
    return this.http.put<any>(url, null, { params: params } );
  }

  getBookingStatus(bookingId: string): Observable<any> {
    const url = `${API_BASE_URL}/Booking/GetBookingStatus`;
    let params = new HttpParams().set('bookingId', bookingId);
    return this.http.get<any>(url, { params: params } );
  }

  cancelBookingAsPassenger(bookingId: string, passengerId: string): Observable<any> {
    const url = `${API_BASE_URL}/Booking/CancelBookingAsPassenger`;
    const body = {
      bookingId: bookingId,
      passengerId: passengerId
    };
    return this.http.put<any>(url, body );
  }

  completeTrip(tripId: string): Observable<any> {
    const url = `${API_BASE_URL}/Trip/CompleteTrip/${tripId}`;
    const body = { tripId: tripId };
    return this.http.put(url, body );
  }

//   rateDriver(driverId: string, rating: number): Observable<any> {
//     const url = `${API_BASE_URL}/Driver/updateDriverRating`;
//     const body = { driverId, rating };
//     return this.http.put(url, body );
//   }

//  ratePassenger(id: string, rating: number): Observable<any> {
//     const url = `${API_BASE_URL}/Passenger/UpdatePassengerRating`;
    
  
//     const body = {
//       passangerID: id, 
//       rating: rating
//     };

//     const headers = new HttpHeaders({
//       'Content-Type': 'application/json'
//     });

//     return this.http.put(url, body, { headers: headers } );
//   }
 createReview(payload: CreateReviewPayload): Observable<any> {
    const url = `${API_BASE_URL}/Review/CreateReview`;
    return this.http.post(url, payload );
  }
}

