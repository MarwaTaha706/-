import { Component, OnInit, inject } from '@angular/core'; 
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';


import { TripSuggestionService } from '../../services/trip-suggestion.service';
import { UrlTransformerService } from '../../services/url-transformer.service';
@Component({
  selector: 'app-suggested-trips',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './suggested-trips.component.html',
  styleUrls: ['./suggested-trips.component.css']
})
export class SuggestedTripsComponent implements OnInit {
  
  suggestedTrips: any[] = [];
  isLoading = true;


  private tripSuggestionService = inject(TripSuggestionService);
  private router = inject(Router);
  public urlTransformer = inject(UrlTransformerService);


  ngOnInit(): void {
    this.loadSuggestions();
  }

  loadSuggestions(): void {
    this.isLoading = true;
    this.tripSuggestionService.GetAllTripSuggetions({}).subscribe({ 
      next: (response: any) => {
        this.suggestedTrips = response?.data || []; 
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('An error occurred while fetching trips:', err);
        this.suggestedTrips = []; 
        this.isLoading = false;
      }
    });
  }


  getStreetAddress(fullAddress: string, city: string, country: string): string {
    if (!fullAddress) return 'No specific address';
    let street = fullAddress.replace(city, '').replace(country, '').replace(/[0-9]/g, '').replace(/, ,/g, ',').replace(/ ,/g, ',').trim();
    if (street.startsWith(',')) street = street.substring(1).trim();
    if (street.endsWith(',')) street = street.slice(0, -1).trim();
    return street || city;
  }

  // Functions for button actions
  viewTripDetails(trip: any): void {
    console.log('Viewing details for trip:', trip.id);
    // this.router.navigate(['/trip-details', trip.id]);
  }

  contactPassenger(trip: any): void {
    alert(`To contact ${trip.userName}, use: ${trip.passengerEmail || 'No email provided'}`);
  }
}
