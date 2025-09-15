import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { TripCard } from '../../models/trip.model';
import { TripService } from '../../services/trip.service';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

export interface Location {
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-passenger-dashboard',
  standalone: true,
  imports: [NgClass, CommonModule, FormsModule],
  templateUrl: './passenger-dashboard.component.html',
  styleUrls: ['./passenger-dashboard.component.css'],
})
export class PassengerDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('tripCardsContainer') tripCardsContainer!: ElementRef<HTMLDivElement>;

  // --- Component Properties ---
  rides: TripCard[] = [];
  filteredRides: TripCard[] = [];
  pageNumber = 1;
  pageSize = 10;
  totalPages = 1;
  totalCount = 0;
  isLoading = true;

  // --- Filter Properties ---
  fromLocationText = "";
  toLocationText = "";
  filterGender: string = '';
  filterDate: string = '';
  filterStatus: string = '';

  // --- Map & Geolocation Properties ---
  private map!: L.Map;
  private pickupMarker?: L.Marker;
  private dropoffMarker?: L.Marker;
  pickupLocation: Location | null = null;
  dropoffLocation: Location | null = null;
  isSelectingPickup = true;
  private fromInputSubject = new Subject<string>();
  private toInputSubject = new Subject<string>();
  private API_BASE_URL = 'http://me4war.runasp.net';

  constructor(
    private tripService: TripService,
    private router: Router,
    public authService: AuthService,
    private route: ActivatedRoute
   ) { }

  ngOnInit(): void {
    // --- Leaflet Icon Setup ---
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    } );

    this.route.queryParams.subscribe(params => {
      this.isLoading = true;
      this.fromLocationText = params['from'] || '';
      this.toLocationText = params['to'] || '';
      this.filterDate = params['date'] || '';
      this.filterGender = params['gender'] || '';
      this.filterStatus = params['status'] || '';
      this.loadTrips();
    });

    this.fromInputSubject.pipe(debounceTime(1000)).subscribe(value => {
      if (value.trim()) this.setLocationByAddress('from', value);
    });
    this.toInputSubject.pipe(debounceTime(1000)).subscribe(value => {
      if (value.trim()) this.setLocationByAddress('to', value);
    });
  }

  loadTrips(): void {
    const statusAsNumber = this.filterStatus ? +this.filterStatus : undefined;

    this.tripService.getAllTrips(
      this.pageNumber,
      this.pageSize,
      this.fromLocationText.trim() || undefined,
      this.toLocationText.trim() || undefined,
      this.filterDate || undefined,
      this.filterGender || undefined,
      statusAsNumber
    ).subscribe({
      next: (response: any) => {
        this.rides = response.data.items;
        this.filteredRides = [...this.rides];
        this.totalPages = response.data.totalPages;
        this.totalCount = response.data.totalCount;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Error loading trips:", err);
        this.rides = [];
        this.filteredRides = [];
        this.isLoading = false;
      }
    });
  }

  onSearchClick(): void {
    this.pageNumber = 1;
    this.isLoading = true;
    this.loadTrips();
  }

 
  scrollCards(direction: 'next' | 'prev'): void {
    const container = this.tripCardsContainer.nativeElement;
    const cardWidth = container.querySelector('.trip-card')?.clientWidth || 0;
    const scrollAmount = cardWidth + 32; 

    container.scrollBy({
      left: direction === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.pageNumber = page;
      this.isLoading = true;
      this.loadTrips();
    }
  }

  navigateToTripDetails(tripId: string): void {
    this.router.navigate(['/trip-details', tripId]);
  }

  navigateToSuggestTrip() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/suggest-trip']);
    } else {
      alert('يجب عليك تسجيل الدخول أولاً لاقتراح رحلة.');
      this.router.navigate(['/auth'], { queryParams: { returnUrl: '/passenger-dashboard' } });
    }
  }

  getFullImageUrl(url: string): string {
    if (!url) return 'https://i.pravatar.cc/100';
    return url.startsWith('http' ) ? url : this.API_BASE_URL + url;
  }

  ngAfterViewInit(): void { this.initMap(); }
  ngOnDestroy(): void { if (this.map) { this.map.remove(); } }

  private initMap(): void {
    this.map = L.map("map").setView([30.0444, 31.2357], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    } ).addTo(this.map);
    this.map.on("click", (e: L.LeafletMouseEvent) => { this.onMapClick(e.latlng); });
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

  onInputChange(type: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      const value = target.value;
      if (type === 'from') {
        this.fromLocationText = value;
        this.fromInputSubject.next(value);
      } else if (type === 'to') {
        this.toLocationText = value;
        this.toInputSubject.next(value);
      }
    }
  }

  async setLocationByAddress(type: 'from' | 'to', address: string): Promise<void> {
    if (!address.trim()) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address )}&limit=1&accept-language=ar`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const location: Location = { lat: parseFloat(lat), lng: parseFloat(lon) };
        this.map.setView([location.lat, location.lng], 15);
        if (type === 'from') {
          await this.setPickupLocation(location);
          this.isSelectingPickup = false;
        } else {
          await this.setDropoffLocation(location);
        }
      }
    } catch (error) {
      console.error('Error searching for address:', error);
    }
  }

  private async setPickupLocation(location: Location): Promise<void> {
    this.pickupLocation = location;
    if (this.pickupMarker) { this.map.removeLayer(this.pickupMarker); }
    const greenIcon = new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41], } );
    this.pickupMarker = L.marker([location.lat, location.lng], { icon: greenIcon }).addTo(this.map).bindPopup("موقع الانطلاق");
    this.fromLocationText = await this.reverseGeocode(location);
  }

  private async setDropoffLocation(location: Location): Promise<void> {
    this.dropoffLocation = location;
    if (this.dropoffMarker) { this.map.removeLayer(this.dropoffMarker); }
    const redIcon = new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41], } );
    this.dropoffMarker = L.marker([location.lat, location.lng], { icon: redIcon }).addTo(this.map).bindPopup("موقع الوصول");
    this.toLocationText = await this.reverseGeocode(location);
  }

  private async reverseGeocode(location: Location): Promise<string> {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&accept-language=ar` );
      const data = await response.json();
      return data.display_name || `${location.lat}, ${location.lng}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${location.lat}, ${location.lng}`;
    }
  }

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
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }

  resetLocations(): void {
    this.fromLocationText = "";
    this.toLocationText = "";
    this.isSelectingPickup = true;
    if (this.pickupMarker) { this.map.removeLayer(this.pickupMarker); this.pickupMarker = undefined; }
    if (this.dropoffMarker) { this.map.removeLayer(this.dropoffMarker); this.dropoffMarker = undefined; }
    this.pickupLocation = null;
    this.dropoffLocation = null;
  }
}
