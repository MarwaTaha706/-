

import { Component, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { TripCard } from '../../models/trip.model';
import { TripService } from '../../services/trip.service';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SuggestTripComponent } from '../suggest-trip/suggest-trip.component';

export interface Location {
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-passenger-dashboard',
  standalone: true,
  imports: [NgClass, CommonModule, FormsModule, SuggestTripComponent],
  templateUrl: './passenger-dashboard.component.html',
  styleUrls: ['./passenger-dashboard.component.css'],
})
export class PassengerDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  passengerCount = 1;
  rides: TripCard[] = [];
  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;

  carTypes: string[] = ['سيدان', 'هاتشباك', 'SUV', 'بيك أب', 'ميني فان'];
  filterCarType: string = '';
  filterSeats: number | null = null;
  filterPrice: number | null = null;
  filterRate: number | null = null;
  filterGender: string = '';
  filterDate: string = '';
  filteredRides: TripCard[] = [];

  constructor(private tripService: TripService, private router: Router, private authService: AuthService) { }

  @Output() locationChange = new EventEmitter<{
    pickup: Location | null;
    dropoff: Location | null;
  }>();

  isSuggestTripModalVisible = false;

  private map!: L.Map;
  private pickupMarker?: L.Marker;
  private dropoffMarker?: L.Marker;
  pickupLocation: Location | null = null;
  dropoffLocation: Location | null = null;
  isSelectingPickup = true;
  searchQuery = "";
  fromLocationText = ""; // To store the "From" input value
  toLocationText = "";   // To store the "To" input value

  private defaultCenter: L.LatLngExpression = [30.0444, 31.2357];

  private updatingFromInput = false;
  private updatingToInput = false;

  private fromInputSubject = new Subject<string>();
  private toInputSubject = new Subject<string>();

  private API_BASE_URL = 'http://me4war.runasp.net';

  ngOnInit(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
    this.loadTrips();
    this.fromInputSubject.pipe(debounceTime(1000)).subscribe(value => {
      if (value.trim()) {
        this.setLocationByAddress('from', value);
      }
    });
    this.toInputSubject.pipe(debounceTime(1000)).subscribe(value => {
      if (value.trim()) {
        this.setLocationByAddress('to', value);
      }
    });
  }

  loadTrips(): void {
    if (this.fromLocationText.trim() && this.toLocationText.trim()) {
      this.tripService.getTripsByLocation(this.fromLocationText, this.toLocationText, undefined, this.pageNumber, this.pageSize)
        .subscribe((response: any) => {
          this.rides = response.data.items;
          this.filteredRides = [...this.rides];
          this.totalPages = response.data.totalPages;
          this.totalCount = response.data.totalCount;
          this.applyFilters(); // ← هنا

        
        });
    } else {
      this.tripService.getAllTrips(this.pageNumber, this.pageSize).subscribe((response: any) => {
        this.rides = response.data.items;
        this.filteredRides = [...this.rides];
        this.totalPages = response.data.totalPages;
        this.totalCount = response.data.totalCount;
        this.applyFilters(); // ← هنا

      });
    }
  }

  nextPage(): void {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadTrips();
    }
  }

  prevPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadTrips();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.pageNumber = page;
      this.loadTrips();
    }
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  // --- Modal Control Methods ---

  // *** تم تعديل هذه الدالة ***
  openSuggestTripModal(): void {
    // تحقق مما إذا كان المستخدم قد سجل دخوله
    if (this.authService.isLoggedIn()) {
      // إذا كان مسجلاً، افتح النافذة المنبثقة كالمعتاد
      this.isSuggestTripModalVisible = true;
    } else {
      alert('يجب عليك تسجيل الدخول أولاً لاقتراح رحلة.');
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/passenger-dashboard' } });
    }
  }

  closeSuggestTripModal(): void {
    this.isSuggestTripModalVisible = false;
  }
  private initMap(): void {
    this.map = L.map("map").setView(this.defaultCenter, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.map.on("click", (e: L.LeafletMouseEvent) => { this.onMapClick(e.latlng); });
  }

  private async reverseGeocode(location: Location): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=ar`
      );
      const data = await response.json();
      return data.display_name || `${location.lat}, ${location.lng}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${location.lat}, ${location.lng}`;
    }
  }
  private async setPickupLocation(location: Location): Promise<void> {
    this.pickupLocation = location;

    if (this.pickupMarker) {
      this.map.removeLayer(this.pickupMarker);
    }
    const greenIcon = new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.pickupMarker = L.marker([location.lat, location.lng], { icon: greenIcon })
      .addTo(this.map)
      .bindPopup("موقع الانطلاق");

    // Get address and set to input
    this.updatingFromInput = true;
    this.fromLocationText = await this.reverseGeocode(location);
    this.updatingFromInput = false;
  }

  private async setDropoffLocation(location: Location): Promise<void> {
    this.dropoffLocation = location;

    if (this.dropoffMarker) {
      this.map.removeLayer(this.dropoffMarker);
    }

    const redIcon = new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    this.dropoffMarker = L.marker([location.lat, location.lng], { icon: redIcon })
      .addTo(this.map)
      .bindPopup("موقع الوصول");

    // Get address and set to input
    this.updatingToInput = true;
    this.toLocationText = await this.reverseGeocode(location);
    this.updatingToInput = false;
  }

  private async onMapClick(latlng: L.LatLng): Promise<void> {
    const location: Location = { lat: latlng.lat, lng: latlng.lng };
    if (this.isSelectingPickup) {
      await this.setPickupLocation(location);
      this.isSelectingPickup = false;
    } else {
      await this.setDropoffLocation(location);
    }
  }
  setSelectionMode(isPickup: boolean): void { this.isSelectingPickup = isPickup; }
  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = { lat: position.coords.latitude, lng: position.coords.longitude };
          this.map.setView([location.lat, location.lng], 15);
          this.setPickupLocation(location);
          this.isSelectingPickup = false;
        },
        (error) => console.error("Error getting current location:", error)
      );
    }
  }
  resetLocations(): void {
    this.fromLocationText = "";
    this.toLocationText = "";
    this.isSelectingPickup = true;
    if (this.pickupMarker) this.map.removeLayer(this.pickupMarker);
    if (this.dropoffMarker) this.map.removeLayer(this.dropoffMarker);
    this.pickupMarker = undefined;
    this.dropoffMarker = undefined;
  }
  private emitLocationChange(): void {
    this.locationChange.emit({
      pickup: this.pickupLocation,
      dropoff: this.dropoffLocation,
    });
  }

  // Set marker and location by address (from input field)
  async setLocationByAddress(type: 'from' | 'to', address: string): Promise<void> {
    if (!address.trim()) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=ar`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const location: Location = { lat: parseFloat(lat), lng: parseFloat(lon) };
        if (type === 'from') {
          await this.setPickupLocation(location);
          this.isSelectingPickup = false;
          this.map.setView([location.lat, location.lng], 15);
        } else {
          await this.setDropoffLocation(location);
          this.map.setView([location.lat, location.lng], 15);
        }
        this.emitLocationChange();
      }
    } catch (error) {
      console.error('خطأ في البحث عن العنوان:', error);
    }
  }


  // Updated method with proper typing and null check
  onInputChange(type: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value !== undefined) {
      const value = target.value;
      if (type === 'from') {
        this.fromLocationText = value;
        if (!this.updatingFromInput) {
          this.fromInputSubject.next(value);
        }
      } else if (type === 'to') {
        this.toLocationText = value;
        if (!this.updatingToInput) {
          this.toInputSubject.next(value);
        }
      }
    }
  }

  // Method to search for rides based on locations
  searchRides(): void {
    this.pageNumber = 1;
    this.loadTrips();
  }

  navigateToTripDetails(tripId: string): void {
    this.router.navigate(['/trip-details', tripId]);
  }

  navigateToSuggestTrip() {
    this.router.navigate(['/suggest-trip']);
  }

  applyFilters() {
    this.filteredRides = this.rides.filter(ride => {
      // فلترة اسم المحافظة في "من"
      const fromMatch = !this.fromLocationText || 
        (ride.departureCity && ride.departureCity.toLowerCase().includes(this.fromLocationText.trim().toLowerCase()));

      // فلترة اسم المحافظة في "إلى"
      const toMatch = !this.toLocationText || 
        (ride.destinationCity && ride.destinationCity.toLowerCase().includes(this.toLocationText.trim().toLowerCase()));

      const carTypeMatch = !this.filterCarType || ride.carType === this.filterCarType;
      const genderMatch = !this.filterGender || ride.driverGender === this.filterGender;

      // فلترة التاريخ (اليوم فقط)
      let dateMatch = true;
      if (this.filterDate) {
        // استخراج yyyy-mm-dd من filterDate
        const filterDateOnly = this.filterDate.slice(0, 10);
        // استخراج yyyy-mm-dd من تاريخ الرحلة
        const rideDateOnly = new Date(ride.departureTime).toISOString().slice(0, 10);
        dateMatch = rideDateOnly === filterDateOnly;
      }

      return fromMatch && toMatch && carTypeMatch && genderMatch && dateMatch;
    });
  }

  resetFilters() {
    this.filterCarType = '';
    this.filterSeats = null;
    this.filterPrice = null;
    this.filterRate = null;
    this.filterGender = '';
    this.filterDate = '';
    this.filteredRides = [...this.rides];
  }

  getFullImageUrl(url: string): string {
    if (!url) return 'https://i.pravatar.cc/100';
    return url.startsWith('http') ? url : this.API_BASE_URL + url;
  }

  onSearchClick() {
    this.searchRides();
    setTimeout(() => this.applyFilters(), 0);
  }
}
