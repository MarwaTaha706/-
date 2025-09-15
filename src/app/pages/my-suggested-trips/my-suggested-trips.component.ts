import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { TripSuggestionService } from '../../services/trip-suggestion.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service'; // 👈 1. IMPORT ProfileService

import { TripSuggestion } from '../../models/trip-suggestion.model';

@Component({
  selector: 'app-my-suggested-trips',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './my-suggested-trips.component.html',
  styleUrls: ['./my-suggested-trips.component.css']
})
export class MySuggestedTripsComponent implements OnInit {

  myTrips: TripSuggestion[] = [];
  isLoading = true;
  currentUsername: string | null = null;
  userProfile: any = null; // 👈 2. ADD userProfile property

  constructor(
    private tripSuggestionService: TripSuggestionService,
    private authService: AuthService,
    private profileService: ProfileService, // 👈 3. INJECT ProfileService
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log('=== My Suggested Trips Component Initialized ===');
    
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser?.name) {
      this.currentUsername = currentUser.name;
      console.log('Using username from token:', this.currentUsername);
      this.loadMyTrips();
      this.loadUserProfile(); // 👈 4. CALL the new function to load profile data
    } else {
      this.isLoading = false;
      console.error("Cannot fetch trips because the user is unknown.");
    }
  }

  // ✅ 5. ADD new function to load the user's profile
  loadUserProfile(): void {
    this.profileService.getPassengerProfile().subscribe({
      next: (profileData) => {
        this.userProfile = profileData.data;
        console.log('User profile loaded:', this.userProfile);
      },
      error: (err) => {
        console.error('Failed to load user profile:', err);
      }
    });
  }

  loadMyTrips(): void {
    // ... (this function remains unchanged)
    this.isLoading = true;
    this.tripSuggestionService.getUserTripSuggestions('').subscribe({
      next: (response) => {
        let allTrips: TripSuggestion[] = response?.data || (Array.isArray(response) ? response : []);
        this.myTrips = allTrips.filter((trip: any) => {
          const tripUsername = trip.userName || trip.username;
          return tripUsername && this.currentUsername && 
                 tripUsername.toLowerCase() === this.currentUsername.toLowerCase();
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch my suggested trips:', err);
        this.myTrips = [];
        this.isLoading = false;
      }
    });
  }

  public getStreetAddress(fullAddress: string, city: string, country: string): string {
    // ... (this function remains unchanged)
    if (!fullAddress) return 'لا يوجد عنوان محدد';
    let street = fullAddress.replace(city, '').replace(country, '').replace(/[0-9]/g, '').replace(/, ,/g, ',').replace(/ ,/g, ',').trim();
    if (street.startsWith(',')) street = street.substring(1).trim();
    if (street.endsWith(',')) street = street.slice(0, -1).trim();
    return street || city;
  }

  deleteTrip(trip: TripSuggestion): void {
    // ... (this function remains unchanged)
    if (!trip.id) {
      alert('لا يمكن حذف الرحلة: لا يوجد معرف (ID) صالح.');
      return;
    }
    if (confirm('هل أنت متأكد من أنك تريد حذف هذه الرحلة؟')) {
      this.tripSuggestionService.deleteSuggestion(trip.id).subscribe({
        next: () => {
          alert('تم حذف الرحلة بنجاح!');
          this.loadMyTrips();
        },
        error: (err) => {
          console.error('فشل حذف الرحلة:', err);
          alert('حدث خطأ أثناء حذف الرحلة.');
        }
      });
    }
  }

  editTrip(trip: TripSuggestion): void {
    // ... (this function remains unchanged)
    if (!trip.id) {
      alert('لا يمكن تعديل الرحلة: لا يوجد معرف (ID) صالح.');
      return;
    }
    this.router.navigate(['/suggest-trip', trip.id]);
  }

  createNewSuggestion(): void {
    // ... (this function remains unchanged)
    this.router.navigate(['/suggest-trip']);
  }
}
