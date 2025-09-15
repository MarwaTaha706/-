import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TripService, CreateReviewPayload } from '../../services/trip.service';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { UrlTransformerService } from '../../services/url-transformer.service';


export interface ConfirmedPassenger {
  id: string;
  name: string;
  imageUrl: string;
  hasBeenRated?: boolean;
}
export interface PendingBooking {
  booking: string;
  seatsBooked: number;
  price: number;
  status: number;
  passengerImageURL: string;
  passengerName: string;
  passengerRating: number;
}
export interface UserBookingStatus {
  bookingId: string;
  status: 'قيد الانتظار' | 'مؤكد' | 'ملغي' | string;
}
export interface RatingData {
  targetName: string;
  targetId: string;
  rating: number;
  comment: string;
}

@Component({
  selector: 'app-trip-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trip-details.component.html',
  styleUrls: ['./trip-details.component.css']
} )
export class TripDetailsComponent implements OnInit {

  tripId: string | null = null;
  trip: any = null;
  confirmedPassengers: ConfirmedPassenger[] = [];
  pendingBookings: PendingBooking[] = [];
  userBookingStatus: UserBookingStatus | null = null;
  isLoading: boolean = true;
  hasRatedDriver: boolean = false;
  isConfirmedPassenger: boolean = false;
  activeDriverTab: 'pending' | 'confirmed' = 'pending';


  showRatingModal = false;
  isSubmittingRating = false;
  ratingData: RatingData = { targetName: '', targetId: '', rating: 0, comment: '' };

 
  showModal: boolean = false;
  modalSeats: number = 1;
  availableSeatsArray: number[] = [];
  totalPrice: number = 0;
  isSuggestingPrice: boolean = false; 
  suggestedPrice: number | null = null; 

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tripService = inject(TripService);
  private authService = inject(AuthService);
  private urlTransformer = inject(UrlTransformerService);

  constructor() {
    this.tripId = this.route.snapshot.paramMap.get('id');
  }

  ngOnInit(): void {
    if (this.tripId) {
      this.loadAllTripData(this.tripId);
    } else {
      console.error("Trip ID is missing from the route.");
      this.isLoading = false;
    }
  }



  loadAllTripData(tripId: string): void {
    this.isLoading = true;
    this.tripService.getTripById(tripId).subscribe({
      next: res => {
        this.trip = res.data;
        if (this.trip) {
          this.trip.driverImageUrl = this.urlTransformer.toAbsoluteUrl(this.trip.driverImageUrl);
          this.hasRatedDriver = this.trip.hasCurrentUserRatedDriver || false;
        }
        this.confirmedPassengers = (this.trip?.passengers || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          imageUrl: this.urlTransformer.toAbsoluteUrl(p.imageUrl),
          hasBeenRated: !!localStorage.getItem(`rated_user_${p.id}_on_trip_${this.tripId}`)
        }));
        this.checkIfUserIsConfirmedPassenger();
        this.updateAvailableSeatsArray();
        if (this.isCurrentUserDriver()) {
          this.loadPendingBookings(tripId);
        } else {
          this.loadUserBookingStatus();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load trip details:', err);
        this.isLoading = false;
        Swal.fire('خطأ', 'فشل تحميل تفاصيل الرحلة.', 'error');
      }
    });
  }

  loadPendingBookings(tripId: string): void {
    this.tripService.getPendingBookings(tripId).subscribe({
      next: result => {
        const bookings = (result && Array.isArray(result.data)) ? result.data : [];
        this.pendingBookings = bookings.map((booking: PendingBooking) => ({
          ...booking,
          passengerImageURL: this.urlTransformer.toAbsoluteUrl(booking.passengerImageURL)
        }));
      },
      error: (err) => console.error('Failed to load pending bookings:', err)
    });
  }

  loadUserBookingStatus(): void {
    const storedBookingId = localStorage.getItem(`bookingId_for_trip_${this.tripId}`);
    if (storedBookingId) {
      this.tripService.getBookingStatus(storedBookingId).subscribe({
        next: (res) => {
          if (res && res.data) {
            this.userBookingStatus = { bookingId: storedBookingId, status: res.data };
          }
        },
        error: () => {
          localStorage.removeItem(`bookingId_for_trip_${this.tripId}`);
          this.userBookingStatus = null;
        }
      });
    }
  }

  // --- Booking Modal and Logic (UPDATED) ---

  openModal(): void {
    this.modalSeats = 1;
    this.isSuggestingPrice = false;
    this.suggestedPrice = null;
    this.updateTotalPrice(); // Calculate initial price based on default
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  updateTotalPrice(): void {
    const basePricePerSeat = this.trip?.seatPrice || 0;
    if (this.isSuggestingPrice && this.suggestedPrice && this.suggestedPrice > 0) {
      this.totalPrice = this.modalSeats * this.suggestedPrice;
    } else {
      this.totalPrice = this.modalSeats * basePricePerSeat;
    }
  }

  confirmBooking(): void {
    if (!this.tripId) {
      Swal.fire('خطأ', 'رقم الرحلة غير موجود!', 'error');
      return;
    }

    const pricePerSeatForBooking = (this.isSuggestingPrice && this.suggestedPrice)
      ? this.suggestedPrice
      : this.trip.seatPrice;

    if (this.isSuggestingPrice && (!pricePerSeatForBooking || pricePerSeatForBooking <= 0)) {
      Swal.fire('تنبيه', 'الرجاء إدخال سعر مقترح صالح (أكبر من صفر).', 'warning');
      return;
    }

    // Assuming your service's `bookRide` method now accepts price per seat
    this.tripService.bookRide(this.tripId, this.modalSeats, pricePerSeatForBooking).subscribe({
      next: (res) => {
        const newBookingId = res.data;
        if (typeof newBookingId === 'string' && newBookingId.length > 0) {
          localStorage.setItem(`bookingId_for_trip_${this.tripId}`, newBookingId);
          this.closeModal();
          const successMessage = this.isSuggestingPrice
            ? 'تم إرسال عرض السعر بنجاح. سيقوم السائق بمراجعته.'
            : 'تم إرسال طلب الحجز بنجاح!';
          Swal.fire('تم بنجاح', successMessage, 'success');
          this.loadUserBookingStatus();
        } else {
          Swal.fire('فشل الحجز', res.message || 'لم يتم استلام معرّف الحجز من الخادم.', 'error');
        }
      },
      error: (err: HttpErrorResponse) => {
        const errorMessage = err.error?.message || 'حدث خطأ غير متوقع.';
        Swal.fire('فشل الحجز', errorMessage, 'error');
      }
    });
  }



  updateAvailableSeatsArray(): void {
    const seats = this.trip?.seatsNumber || 0;
    this.availableSeatsArray = seats > 0 ? Array.from({ length: seats }, (_, i) => i + 1) : [];
  }

  isCurrentUserDriver(): boolean {
    const currentUserId = this.authService.getCurrentUserId();
    return !!(currentUserId && this.trip?.driverId && currentUserId.trim().toLowerCase() === this.trip.driverId.trim().toLowerCase());
  }

  checkIfUserIsConfirmedPassenger(): void {
    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId || !this.confirmedPassengers || this.confirmedPassengers.length === 0) {
      this.isConfirmedPassenger = false;
      return;
    }
    this.isConfirmedPassenger = this.confirmedPassengers.some(
      passenger => passenger.id.trim().toLowerCase() === currentUserId.trim().toLowerCase()
    );
  }


  acceptBooking(bookingId: string): void {
    Swal.fire({
      title: 'هل تريد قبول هذا الحجز؟', icon: 'question', showCancelButton: true,
      confirmButtonColor: '#28a745', cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، قبول', cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.showLoading();
        this.tripService.acceptBooking(bookingId).subscribe({
          next: () => {
            Swal.fire('تم القبول!', 'تم قبول الحجز بنجاح.', 'success');
            if (this.tripId) this.loadAllTripData(this.tripId);
          },
          error: (err: HttpErrorResponse) => Swal.fire('خطأ', err.error?.message || 'فشل قبول الحجز.', 'error')
        });
      }
    });
  }

  cancelBookingByDriver(bookingId: string): void {
    Swal.fire({
      title: 'هل أنت متأكد من رفض هذا الحجز؟', icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، رفض الحجز', cancelButtonText: 'إلغاء'
    }).then((result) => {
      if (result.isConfirmed && this.tripId) {
        Swal.showLoading();
        this.tripService.cancelBookingByDriver(bookingId, this.tripId).subscribe({
          next: () => {
            Swal.fire('تم الرفض!', 'تم رفض الحجز بنجاح.', 'success');
            if (this.tripId) this.loadPendingBookings(this.tripId);
          },
          error: (err: HttpErrorResponse) => Swal.fire('خطأ', err.error?.message || 'فشل رفض الحجز.', 'error')
        });
      }
    });
  }

  // --- Passenger Actions ---

  confirmCancelBookingAsPassenger(bookingId: string): void {
    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId) { Swal.fire('خطأ', 'لا يمكن تحديد هوية الراكب.', 'error'); return; }
    Swal.fire({
      title: 'هل أنت متأكد من إلغاء حجزك؟', icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، إلغاء الحجز', cancelButtonText: 'تراجع'
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeCancelBookingAsPassenger(bookingId, currentUserId);
      }
    });
  }

  private executeCancelBookingAsPassenger(bookingId: string, passengerId: string): void {
    Swal.showLoading();
    this.tripService.cancelBookingAsPassenger(bookingId, passengerId).subscribe({
      next: () => {
        Swal.fire('تم الإلغاء', 'تم إلغاء حجزك بنجاح.', 'success');
        this.userBookingStatus = null;
        localStorage.removeItem(`bookingId_for_trip_${this.tripId}`);
        if (this.tripId) this.loadAllTripData(this.tripId);
      },
      error: (err: HttpErrorResponse) => Swal.fire('خطأ', err.error?.message || 'فشل إلغاء الحجز.', 'error')
    });
  }

  // --- Rating Actions ---
  // (All rating methods remain unchanged)
  openRateDriverModal() {
    if (!this.trip || this.hasRatedDriver || !this.tripId) return;
    this.ratingData = { targetName: this.trip.driverName, targetId: this.trip.driverId, rating: 0, comment: '' };
    this.showRatingModal = true;
  }

  openRatePassengerModal(passenger: ConfirmedPassenger) {
    if (passenger.hasBeenRated || !this.tripId) return;
    this.ratingData = { targetName: passenger.name, targetId: passenger.id, rating: 0, comment: '' };
    this.showRatingModal = true;
  }

  closeRatingModal() {
    this.showRatingModal = false;
    this.ratingData = { targetName: '', targetId: '', rating: 0, comment: '' };
  }

  submitRating() {
    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId || !this.tripId) { Swal.fire('خطأ', 'لا يمكن تحديد هويتك.', 'error'); return; }
    if (this.ratingData.rating === 0) { Swal.fire('تنبيه', 'الرجاء اختيار تقييم (نجمة واحدة على الأقل).', 'warning'); return; }
    this.isSubmittingRating = true;
    const payload: CreateReviewPayload = { tripId: this.tripId, reviewerId: currentUserId, revieweeId: this.ratingData.targetId, rate: this.ratingData.rating, comment: this.ratingData.comment };
    this.tripService.createReview(payload).subscribe({
      next: () => {
        Swal.fire('شكراً لك!', 'تم تسجيل تقييمك بنجاح.', 'success');
        if (this.ratingData.targetId === this.trip.driverId) { this.hasRatedDriver = true; }
        else {
          const ratedPassenger = this.confirmedPassengers.find(p => p.id === this.ratingData.targetId);
          if (ratedPassenger) {
            ratedPassenger.hasBeenRated = true;
            localStorage.setItem(`rated_user_${ratedPassenger.id}_on_trip_${this.tripId}`, 'true');
          }
        }
        this.isSubmittingRating = false;
        this.closeRatingModal();
      },
      error: (err) => { Swal.fire('خطأ', err.error?.message || 'فشل إرسال التقييم.', 'error'); this.isSubmittingRating = false; }
    });
  }

 
  confirmStartTrip(): void {
    if (this.trip?.status !== 1) { Swal.fire('لا يمكن البدء', 'لا يمكن بدء هذه الرحلة لأنها ليست في حالة "مجدولة".', 'warning'); return; }
    Swal.fire({ title: 'هل أنت جاهز لبدء الرحلة؟', text: "سيتم إعلام الركاب بأن الرحلة قد بدأت.", icon: 'info', showCancelButton: true, confirmButtonColor: '#28a745', cancelButtonColor: '#6c757d', confirmButtonText: 'نعم، ابدأ الرحلة!', cancelButtonText: 'ليس بعد' }).then((result) => { if (result.isConfirmed) { this.executeStartTrip(); } });
  }

  private executeStartTrip(): void {
    if (!this.tripId) { Swal.fire('خطأ', 'رقم الرحلة غير موجود!', 'error'); return; }
    Swal.showLoading();
    this.tripService.startTrip(this.tripId).subscribe({
      next: () => { Swal.fire('بدأت الرحلة!', 'تم بدء رحلتك بنجاح.', 'success'); if (this.trip) { this.trip.status = 2; } },
      error: (err: HttpErrorResponse) => { Swal.fire('فشل الإجراء', err.error?.message || 'لم نتمكن من بدء الرحلة.', 'error'); }
    });
  }

  confirmCompleteTrip(): void {
    if (this.trip?.status !== 2) { Swal.fire('لا يمكن الإنهاء', 'لا يمكن إنهاء هذه الرحلة لأنها ليست في حالة "جارية".', 'warning'); return; }
    Swal.fire({ title: 'هل أنت متأكد من إنهاء الرحلة؟', text: "سيتم إغلاق الرحلة ولن تكون متاحة للحجز أو التعديل.", icon: 'question', showCancelButton: true, confirmButtonColor: '#007bff', cancelButtonColor: '#6c757d', confirmButtonText: 'نعم، أنهِ الرحلة!', cancelButtonText: 'إلغاء' }).then((result) => { if (result.isConfirmed) { this.executeCompleteTrip(); } });
  }

  private executeCompleteTrip(): void {
    if (!this.tripId) { Swal.fire('خطأ', 'رقم الرحلة غير موجود!', 'error'); return; }
    Swal.showLoading();
    this.tripService.completeTrip(this.tripId).subscribe({
      next: () => { Swal.fire('تم الإنهاء!', 'تم إنهاء الرحلة بنجاح.', 'success'); if (this.trip) { this.trip.status = 3; } },
      error: (err: HttpErrorResponse) => { Swal.fire('فشل الإجراء', err.error?.message || 'لم نتمكن من إنهاء الرحلة.', 'error'); }
    });
  }

  async openUpdateTripModal(): Promise<void> {
    const { value: newSeats } = await Swal.fire({ title: 'تحديث عدد المقاعد المتاحة', input: 'number', inputLabel: 'أدخل العدد الجديد للمقاعد', inputValue: this.trip.seatsNumber, inputAttributes: { min: '1', step: '1' }, showCancelButton: true, confirmButtonText: 'حفظ التغييرات', cancelButtonText: 'إلغاء', inputValidator: (value) => { if (!value || parseInt(value) < 1) { return 'الرجاء إدخال عدد مقاعد صالح!'; } return null; } });
    if (newSeats) { this.updateTripSeats(parseInt(newSeats)); }
  }

  private updateTripSeats(seats: number): void {
    if (!this.tripId) return;
    Swal.showLoading();
    this.tripService.updateTrip(this.tripId, seats).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'تم التحديث بنجاح!', text: `تم تغيير عدد المقاعد المتاحة إلى ${seats}.` });
        this.trip.seatsNumber = seats;
        this.updateAvailableSeatsArray();
      },
      error: (err: HttpErrorResponse) => { Swal.fire({ icon: 'error', title: 'فشل التحديث', text: err.error?.message || 'لم نتمكن من تحديث الرحلة.' }); }
    });
  }

  confirmDeleteTrip(): void {
    Swal.fire({ title: 'هل أنت متأكد من إلغاء الرحلة؟', text: "لا يمكن التراجع عن هذا الإجراء!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'نعم، قم بالإلغاء!', cancelButtonText: 'تراجع' }).then((result) => { if (result.isConfirmed) { this.deleteTrip(); } });
  }

  private deleteTrip(): void {
    if (!this.tripId) return;
    Swal.showLoading();
    this.tripService.deleteTrip(this.tripId).subscribe({
      next: () => {
        Swal.fire('تم الإلغاء!', 'لقد تم إلغاء رحلتك بنجاح.', 'success').then(() => { this.router.navigate(['/passenger-dashboard']); });
        if (this.trip) { this.trip.status = 4; }
      },
      error: (err) => { Swal.fire('فشل الإلغاء', err.error?.message || 'لم نتمكن من إلغاء الرحلة.', 'error'); }
    });
  }

  openChat(): void {
    console.log('Opening chat...');
  }
}
