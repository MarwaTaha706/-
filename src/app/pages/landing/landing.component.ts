import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // ✅ 1. Import FormsModule for ngModel
import { Router } from '@angular/router';     // ✅ 2. Import Router for navigation

@Component({
  selector: 'app-landing',
  standalone: true, // This component is standalone
  imports: [
    CommonModule, 
    FormsModule // ✅ 3. Add FormsModule to the imports array
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
  // --- Existing properties for image carousel ---
  showMore = false;
  carImages = [
    'car1.png',
    'car2.png',
    'car3.png',
    'car4.png',
    'car5.png'
  ];
  currentCarIndex = 0;
  currentCarImage = this.carImages[0];
  private intervalId: any;

  // ✅ 4. Add properties to bind to the search form in the HTML
  fromLocation: string = '';
  toLocation: string = '';
  rideDate: string = '';

  // ✅ 5. Inject the Router service in the constructor
  constructor(private router: Router) {}

  ngOnInit() {
    // Start the image carousel interval
    this.intervalId = setInterval(() => {
      this.currentCarIndex = (this.currentCarIndex + 1) % this.carImages.length;
      this.currentCarImage = this.carImages[this.currentCarIndex];
    }, 2000);
  }

  ngOnDestroy() {
    // Clear the interval when the component is destroyed to prevent memory leaks
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  /**
   * ✅ 6. Add the method to handle the form submission.
   * This method will be called when the user clicks the "اطلب الآن" button.
   */
  searchForRide(): void {
    // Create a query parameters object.
    // This will hold the search data to be passed in the URL.
    const queryParams: any = {};

    // Only add parameters to the object if they have a value.
    // This keeps the URL clean.
    if (this.fromLocation) {
      queryParams.from = this.fromLocation;
    }
    if (this.toLocation) {
      queryParams.to = this.toLocation;
    }
    if (this.rideDate) {
      queryParams.date = this.rideDate;
    }

    // Use the Router to navigate to the passenger dashboard page.
    // Pass the search criteria as query parameters in the URL.
    // Example URL: /passenger-dashboard?from=Cairo&to=Alexandria
    this.router.navigate(['/passenger-dashboard'], { queryParams });
  }
}
