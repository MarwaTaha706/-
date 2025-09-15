

import { Component, OnInit, OnDestroy, AfterViewInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';
import { finalize, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

import { TripSuggestionService } from '../../services/trip-suggestion.service';
import { CreateTripSuggestionRequest, SuggestedLocation, TripSuggestion } from '../../models/trip-suggestion.model';

import { icon, Marker } from 'leaflet';
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = icon({
  iconRetinaUrl, iconUrl, shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  tooltipAnchor: [16, -28], shadowSize: [41, 41]
} );
Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-suggest-trip',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './suggest-trip.component.html',
  styleUrls: ['./suggest-trip.component.css']
})
export class SuggestTripComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('tripForm') tripForm!: NgForm;

  tripDetails = { from: '', to: '', dateTime: '', passengers: 1, price: null as number | null, notes: '' };
  private departureLocation: SuggestedLocation | null = null;
  private destinationLocation: SuggestedLocation | null = null;
  private originalClassifications: number = 0;

  private map!: L.Map;
  private fromMarker?: L.Marker;
  private toMarker?: L.Marker;
  activeField: 'from' | 'to' | null = null;
  private defaultCenter: L.LatLngTuple = [30.0444, 31.2357];

  isSubmitting = false;
  isEditMode = false;
  currentTripId: string | null = null;
  isLoading = false;
  pageTitle = 'اقترح رحلة جديدة';
  buttonText = 'تأكيد الاقتراح';

  private fromInputSubject = new Subject<string>();
  private toInputSubject = new Subject<string>();

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient );
  private suggestionService = inject(TripSuggestionService);

  ngOnInit(): void {
    this.currentTripId = this.route.snapshot.paramMap.get('id');
    if (this.currentTripId) {
      this.isEditMode = true;
      this.pageTitle = 'تعديل الرحلة';
      this.buttonText = 'حفظ التعديلات';
      this.isLoading = true;
    }
    this.fromInputSubject.pipe(debounceTime(1000)).subscribe(address => this.setLocationByAddress('from', address));
    this.toInputSubject.pipe(debounceTime(1000)).subscribe(address => this.setLocationByAddress('to', address));
  }

  ngAfterViewInit(): void {
    this.initMap();
    if (this.isEditMode && this.currentTripId) {
      this.loadTripForEditing(this.currentTripId);
    }
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    if (document.getElementById('popup-map') && !this.map) {
      this.map = L.map('popup-map').setView(this.defaultCenter, 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' ).addTo(this.map);
    }
  }

  loadTripForEditing(id: string): void {
    this.suggestionService.getSuggestionById(id).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (response) => {
        const trip: TripSuggestion = response?.data || response;
        if (!trip) { alert('لم يتم العثور على الرحلة.'); this.router.navigate(['/my-suggested-trips']); return; }
        this.tripDetails = {
          from: trip.departure?.address || '', to: trip.destination?.address || '',
          dateTime: trip.preferredDepartureTime ? new Date(trip.preferredDepartureTime).toISOString().slice(0, 16) : '',
          passengers: trip.seatCount, price: trip.suggestedPrice, notes: trip.description || ''
        };
        this.departureLocation = trip.departure;
        this.destinationLocation = trip.destination;
        this.originalClassifications = trip.classifications;
        if (this.departureLocation) this.updateMarker(this.departureLocation.latitude, this.departureLocation.longitude, 'from');
        if (this.destinationLocation) this.updateMarker(this.destinationLocation.latitude, this.destinationLocation.longitude, 'to');
      },
      error: () => { alert('فشل تحميل بيانات الرحلة.'); this.router.navigate(['/my-suggested-trips']); }
    });
  }

  onMapClick(e: L.LeafletMouseEvent): void {
    if (!this.activeField) {
      alert('الرجاء تحديد حقل "من" أو "إلى" أولاً.');
      return;
    }
    const { lat, lng } = e.latlng;
    this.updateMarker(lat, lng, this.activeField);
    this.reverseGeocode(lat, lng, this.activeField);
  }

 
  selectOnMap(field: 'from' | 'to'): void {
    this.activeField = field;
    if (this.map) {
      this.map.off('click');
      this.map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e));
    }
  }

  onAddressInput(type: 'from' | 'to', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (type === 'from') this.fromInputSubject.next(value);
    else this.toInputSubject.next(value);
  }

  async setLocationByAddress(type: 'from' | 'to', address: string): Promise<void> {
    if (!address.trim()) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address )}&limit=1&accept-language=ar`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        this.updateMarker(parseFloat(lat), parseFloat(lon), type);
        const locationData: SuggestedLocation = {
          id: '', description: data[0].display_name, address: data[0].display_name,
          latitude: parseFloat(lat), longitude: parseFloat(lon),
          city: data[0].address.city || data[0].address.town || data[0].address.village || 'غير محدد',
          country: data[0].address.country || 'غير محدد'
        };
        if (type === 'from') this.departureLocation = locationData;
        else this.destinationLocation = locationData;
      }
    } catch (error) { console.error('Error searching for address:', error); }
  }

  private updateMarker(lat: number, lng: number, field: 'from' | 'to'): void {
    if (!this.map) return;
    const markerRef = field === 'from' ? 'fromMarker' : 'toMarker';
    const iconColor = field === 'from' ? 'green' : 'red';
    const customIcon = new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    } );
    if (this[markerRef]) {
      this[markerRef]!.setLatLng([lat, lng]);
    } else {
      this[markerRef] = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
    }
    this.map.setView([lat, lng], 15);
  }

  private reverseGeocode(lat: number, lng: number, field: 'from' | 'to'): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`;
    this.http.get<any>(url ).subscribe(data => {
      if (data?.display_name) {
        const address = data.display_name;
        this.tripDetails[field] = address;
        if (field === 'from') this.fromInputSubject.next(address);
        else this.toInputSubject.next(address);
        const locationData: SuggestedLocation = {
          id: '', description: address, address: address, latitude: lat, longitude: lng,
          city: data.address.city || data.address.town || data.address.village || 'غير محدد',
          country: data.address.country || 'غير محدد'
        };
        if (field === 'from') this.departureLocation = locationData;
        else this.destinationLocation = locationData;
      }
    });
  }

  onSubmit(): void {
    if (!this.tripForm.form.valid || !this.departureLocation || !this.destinationLocation) {
      alert('يرجى ملء جميع الحقول المطلوبة وتحديد المواقع على الخريطة.'); return;
    }
    this.isSubmitting = true;
    const request = this.isEditMode ? this.prepareEditRequest() : this.prepareCreateRequest();
    const operation = this.isEditMode ? this.suggestionService.editSuggestion(request as TripSuggestion) : this.suggestionService.createSuggestion(request as CreateTripSuggestionRequest);
    operation.pipe(finalize(() => this.isSubmitting = false)).subscribe({
      next: () => {
        alert(this.isEditMode ? 'تم تحديث الرحلة بنجاح!' : 'تم اقتراح الرحلة بنجاح!');
        this.router.navigate(['/my-suggested-trips']);
      },
      error: (err) => { alert('حدث خطأ أثناء الحفظ.'); console.error(err); }
    });
  }

  private prepareCreateRequest(): CreateTripSuggestionRequest {
    return { departure: this.departureLocation!, destination: this.destinationLocation!, seatCount: Number(this.tripDetails.passengers), suggestedPrice: Number(this.tripDetails.price), preferredDepartureTime: new Date(this.tripDetails.dateTime).toISOString(), description: this.tripDetails.notes || '' };
  }

  private prepareEditRequest(): TripSuggestion {
    return { id: this.currentTripId!, departure: this.departureLocation!, destination: this.destinationLocation!, seatCount: Number(this.tripDetails.passengers), suggestedPrice: Number(this.tripDetails.price), preferredDepartureTime: new Date(this.tripDetails.dateTime).toISOString(), description: this.tripDetails.notes || '', classifications: this.originalClassifications };
  }

  onCancel(): void {
    this.router.navigate(['/my-suggested-trips']);
  }
  
  locateUser(): void {
    if (!this.map) return;
    this.map.locate({ setView: true, maxZoom: 16 });
    this.map.on('locationfound', (e: L.LocationEvent) => {
      this.selectOnMap('from');
      this.onMapClick({ latlng: e.latlng } as any);
    });
    this.map.on('locationerror', () => alert("لا يمكن الوصول إلى موقعك."));
  }

  resetMap(): void {
    if (!this.map) return;
    if (this.fromMarker) this.map.removeLayer(this.fromMarker);
    if (this.toMarker) this.map.removeLayer(this.toMarker);
    this.fromMarker = undefined; this.toMarker = undefined;
    this.departureLocation = null; this.destinationLocation = null;
    this.tripDetails.from = ''; this.tripDetails.to = '';
    this.activeField = null;
    this.map.setView(this.defaultCenter, 10);
    this.map.off('click');
  }
}
