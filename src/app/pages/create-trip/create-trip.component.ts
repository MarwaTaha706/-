import { Component, inject, OnInit, OnDestroy, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import * as L from 'leaflet';
import Swal from 'sweetalert2';

import { faCar, faEdit, faRoute, faMapMarkerAlt, faFlag, faCrosshairs, faUndo, faSmokingBan, faMosque, faSuitcaseRolling, faInfoCircle, faStickyNote, faPlus } from '@fortawesome/free-solid-svg-icons';

import { AuthService } from '../../services/auth.service';
import { TripService } from '../../services/trip.service';
import { ProfileService } from '../../services/profile.service';

export interface Location { lat: number; lng: number; }
export interface Car { id: string; model: string; plateNumber: string; }

@Component({
  selector: 'app-create-trip',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './create-trip.component.html',
  styleUrls: ['./create-trip.component.css']
})
export class CreateTripComponent implements OnInit, AfterViewInit, OnDestroy {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private tripService = inject(TripService);
  private profileService = inject(ProfileService);

  icons = {
    edit: faEdit, start: faMapMarkerAlt, end: faFlag, gps: faCrosshairs, reset: faUndo,
    car: faCar, route: faRoute, info: faInfoCircle, note: faStickyNote,
    noSmoke: faSmokingBan, prayer: faMosque, luggage: faSuitcaseRolling, create: faPlus
  };

  tripForm!: FormGroup;
  isSubmitting = signal(false);

  currentStep = signal(1);
  totalSteps = 3;
  driverCars = signal<Car[]>([]);

  private map!: L.Map;
  private pickupMarker?: L.Marker;
  private dropoffMarker?: L.Marker;
  private pickupLocation: Location | null = null;
  private dropoffLocation: Location | null = null;
  isSelectingPickup = true;
  private fromInputSubject = new Subject<string>();
  private toInputSubject = new Subject<string>();

  get totalPrice(): number {
    const seats = this.tripForm?.get('seatsAvailable')?.value || 0;
    const price = this.tripForm?.get('price')?.value || 0;
    return seats * price;
  }

  get selectedCar(): Car | undefined {
    const selectedId = this.tripForm.get('carId')?.value;
    if (!selectedId) {
      return undefined;
    }
    return this.driverCars().find(c => c.id === selectedId);
  }

  ngOnInit(): void {
    if (!this.authService.isVerifiedDriver()) {
      this.router.navigate(['/verify-driver']);
      return;
    }

    this.tripForm = this.fb.group({
      startCity: ['', Validators.required],
      destinationCity: ['', Validators.required],
      departureDateTime: ['', Validators.required],
      seatsAvailable: [1, [Validators.required, Validators.min(1)]],
      price: ['', [Validators.required, Validators.min(1)]],
      notes: [''],
      carId: [null, Validators.required],
      // ✅ NEW: Add the form control for the toggle switch
      autoAcceptBooking: [true, Validators.required] // Default to true
    });

    this.fetchDriverCars();
    this.initializeLeafletIcons();

    this.fromInputSubject.pipe(debounceTime(1000)).subscribe(address => {
      if (address) this.setLocationByAddress('from', address);
    });
    this.toInputSubject.pipe(debounceTime(1000)).subscribe(address => {
      if (address) this.setLocationByAddress('to', address);
    });

    this.tripForm.get('startCity')?.valueChanges.subscribe(value => this.fromInputSubject.next(value));
    this.tripForm.get('destinationCity')?.valueChanges.subscribe(value => this.toInputSubject.next(value));
  }

  fetchDriverCars(): void {
    this.profileService.getDriverVehicleDetails().subscribe({
      next: (response) => {
        if (response && response.data) {
          const car = response.data;
          this.driverCars.set([car]);
          this.tripForm.get('carId')?.setValue(car.id);
        }
      },
      error: (err) => {
        console.error('Failed to fetch driver cars:', err);
        this.driverCars.set([]);
      }
    });
  }

  ngAfterViewInit(): void { this.initMap(); }
  ngOnDestroy(): void {
    if (this.map) { this.map.remove(); }
    this.fromInputSubject.unsubscribe();
    this.toInputSubject.unsubscribe();
  }

  nextStep(): void {
    if (this.isStepValid()) {
      this.currentStep.update(step => Math.min(step + 1, this.totalSteps));
    } else {
      this.tripForm.markAllAsTouched();
    }
  }
  previousStep(): void { this.currentStep.update(step => Math.max(step - 1, 1)); }

  isStepValid(): boolean {
    const step = this.currentStep();
    if (step === 1) {
      return this.tripForm.get('startCity')!.valid && this.tripForm.get('destinationCity')!.valid;
    }
    if (step === 2) {
      return this.tripForm.get('departureDateTime')!.valid &&
             this.tripForm.get('seatsAvailable')!.valid &&
             this.tripForm.get('price')!.valid &&
             this.tripForm.get('carId')!.valid;
    }
    return this.tripForm.valid;
  }

  getStepTitle(): string {
    const titles = ['تفاصيل الرحلة', 'التوقيت والسعر', 'المراجعة النهائية'];
    return titles[this.currentStep() - 1];
  }

  private initializeLeafletIcons(): void {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    } );
  }
  private initMap(): void {
    if (this.map || !document.getElementById('map')) return;
    setTimeout(() => {
      this.map = L.map("map").setView([30.0444, 31.2357], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors',
      } ).addTo(this.map);
      this.map.on("click", (e: L.LeafletMouseEvent) => this.onMapClick(e.latlng));
    }, 0);
  }
  private async onMapClick(latlng: L.LatLng): Promise<void> {
    const location: Location = { lat: latlng.lat, lng: latlng.lng };
    const address = await this.reverseGeocode(location);
    if (this.isSelectingPickup) {
      this.pickupLocation = location;
      this.setPickupMarker(location, address);
      this.isSelectingPickup = false;
    } else {
      this.dropoffLocation = location;
      this.setDropoffMarker(location, address);
    }
  }
  private setPickupMarker(location: Location, address: string): void {
    this.tripForm.get('startCity')?.setValue(address, { emitEvent: false });
    if (this.pickupMarker) this.map.removeLayer(this.pickupMarker);
    const greenIcon = new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] } );
    this.pickupMarker = L.marker([location.lat, location.lng], { icon: greenIcon }).addTo(this.map);
  }
  private setDropoffMarker(location: Location, address: string): void {
    this.tripForm.get('destinationCity')?.setValue(address, { emitEvent: false });
    if (this.dropoffMarker) this.map.removeLayer(this.dropoffMarker);
    const redIcon = new L.Icon({ iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] } );
    this.dropoffMarker = L.marker([location.lat, location.lng], { icon: redIcon }).addTo(this.map);
  }
  async setLocationByAddress(type: 'from' | 'to', address: string): Promise<void> {
    if (!address.trim()) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address )}&limit=1&accept-language=ar`);
      const data = await response.json();
      if (data && data.length > 0) {
        const location: Location = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        this.map.setView([location.lat, location.lng], 15);
        if (type === 'from') {
          this.pickupLocation = location;
          this.setPickupMarker(location, data[0].display_name);
        } else {
          this.dropoffLocation = location;
          this.setDropoffMarker(location, data[0].display_name);
        }
      }
    } catch (error) { console.error('Geocoding error:', error); }
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
  setSelectionMode(isPickup: boolean): void { this.isSelectingPickup = isPickup; }
  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const location: Location = { lat: position.coords.latitude, lng: position.coords.longitude };
        const latLng = new L.LatLng(location.lat, location.lng);
        this.map.setView(latLng, 15);
        this.onMapClick(latLng);
      });
    }
  }
  resetLocations(): void {
    this.tripForm.get('startCity')?.reset('');
    this.tripForm.get('destinationCity')?.reset('');
    if (this.pickupMarker) this.map.removeLayer(this.pickupMarker);
    if (this.dropoffMarker) this.map.removeLayer(this.dropoffMarker);
    this.pickupMarker = undefined;
    this.dropoffMarker = undefined;
    this.pickupLocation = null;
    this.dropoffLocation = null;
    this.isSelectingPickup = true;
  }

  addNote(note: string): void {
    const notesControl = this.tripForm.get('notes')!;
    const currentNotes = notesControl.value || '';
    notesControl.setValue(currentNotes ? `${currentNotes}. ${note}` : note);
  }
  getMinDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  onSubmit(): void {
    if (!this.tripForm.valid) {
      console.error('Form is invalid. Please check all fields.');
      this.tripForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.tripForm.value;
    const departureTimeISO = new Date(formValue.departureDateTime).toISOString();

    const payload = {
      departureCity: formValue.startCity,
      destinationCity: formValue.destinationCity,
      departureTime: departureTimeISO,
      seatsAvailable: Number(formValue.seatsAvailable),
      price: Number(formValue.price),
      notes: formValue.notes || '',
      // ✅ NEW: Include the value from the form control
      autoAcceptBooking: formValue.autoAcceptBooking,
      carId: formValue.carId,
      departureLatitude: this.pickupLocation?.lat || 0,
      departureLongitude: this.pickupLocation?.lng || 0,
      destinationLatitude: this.dropoffLocation?.lat || 0,
      destinationLongitude: this.dropoffLocation?.lng || 0,
    };

    this.tripService.createTrip(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (response && response.status === 200 && response.data !== null) {
            Swal.fire({
              icon: 'success',
              title: 'تم إنشاء الرحلة بنجاح!',
              text: 'سيتم الآن توجيهك إلى لوحة التحكم.',
              timer: 3000,
              timerProgressBar: true,
              showConfirmButton: false
            }).then(() => {
              this.router.navigate(['/passenger-dashboard']);
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'حدث خطأ',
              text: response.message || 'لم نتمكن من إنشاء الرحلة. يرجى المحاولة مرة أخرى.'
            });
            console.error('API returned a business error:', response.message);
          }
        },
        error: (err: any) => {
          Swal.fire({
            icon: 'error',
            title: 'فشل إنشاء الرحلة',
            text: err.error?.message || 'حدث خطأ غير متوقع. يرجى التحقق من اتصالك بالإنترنت.'
          });
          console.error('Failed to create trip:', err);
        }
      });
  }

  formatDateTime(dateTimeString: string, part: 'date' | 'time'): string {
    if (!dateTimeString) return 'غير محدد';
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return 'تاريخ غير صالح';
    if (part === 'date') return date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}
