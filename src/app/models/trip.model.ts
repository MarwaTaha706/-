export interface Trip {
  from: string;
  to: string;
  carType: string;
  availableSeats: number;
  driver: {
    name: string;
    avatar: string;
    rating: number;
  };
}

export interface CreateTripRequest {
 departureCity: string;
  destinationCity: string;

  departureLatitude: number;
  departureLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;

  departureTime: string;
  seatsAvailable: number;
  price: number;
  
  carId: string; // Assuming carId is a string
  notes?: string; // Optional property
  autoAcceptBooking: boolean;
}

export interface TripCard {
  tripId: string;
  departureCity: string;
  destinationCity: string;
  carType: string;
  departureTime: string;
  availableSeats: number;
  price: number;
  driverName: string;
  driverImageUrl: string;
  rate: number;
  driverGender: string;
  tripStatus: number; 
} 