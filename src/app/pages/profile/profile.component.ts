import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { Subscription, switchMap, of, tap, finalize, forkJoin, catchError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../../api';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [CommonModule, FormsModule],
})
export class ProfileComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  user: any = null;
  isDriver: boolean = false;
  isLoading: boolean = true;
  error: string | null = null;

  public activeView: 'personalInfo' | 'currentTrips' | 'pastTrips' = 'personalInfo';

  driverProfile: any = null;
  passengerProfile: any = null;
  driverVehicle: any = null;
  driverDocuments: any[] = [];
  driverCurrentTrips: any[] = [];
  driverTrips: any[] = [];
  passengerCurrentTrips: any[] = [];
  passengerTrips: any[] = [];
  
  private subscriptions = new Subscription();

  editMode = false;
  isSaving = false;
  editVehicleMode = false;

  editPassengerData = { Name: '', PhoneNumber: '', ProfileImage: undefined as File | undefined };
  editDriverData = { driverName: '', phoneNumber: '', description: '', profileImage: undefined as File | undefined };
  editVehicleData: any = {
    Id: '', DriverId: '', Model: '', Color: '', PlateNumber: '',
    SeatsNumber: 1, Description: '', VehicleImageUrls: [] as File[], previews: [] as string[]
  };

  ngOnInit(): void {
    const authSubscription = this.authService.getLoggedInObservable().pipe(
      tap(isLoggedIn => {
        if (!isLoggedIn) {
          this.clearProfileData();
          this.router.navigate(['/login']);
        }
      }),
      switchMap(isLoggedIn => isLoggedIn ? this.authService.getIsVerifiedDriverObservable() : of(false))
    ).subscribe(isDriver => {
      this.isDriver = isDriver;
      if (this.authService.isLoggedIn()) {
        this.loadInitialData();
      }
    });
    this.subscriptions.add(authSubscription);

    const userSubscription = this.authService.getCurrentUserObservable().subscribe(user => this.user = user);
    this.subscriptions.add(userSubscription);
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.error = null;
    this.activeView = 'personalInfo'; // Set default view on each load
    if (this.isDriver) {
      this.fetchDriverData();
    } else {
      this.fetchPassengerData();
    }
  }

  fetchDriverData(): void {
    const driverData$ = forkJoin({
      profile: this.profileService.getDriverProfile().pipe(catchError(() => of(null))),
      currentTrips: this.profileService.getDriverCurrentTrips().pipe(catchError(() => of({ data: [] }))),
      historyTrips: this.profileService.getDriverHistoryTrips().pipe(catchError(() => of({ data: [] }))),
      documents: this.profileService.getDriverVerificationDocuments().pipe(catchError(() => of({ data: [] }))),
      vehicle: this.profileService.getDriverVehicleDetails().pipe(catchError(() => of(null)))
    }).pipe(
      finalize(() => this.isLoading = false)
    );

    driverData$.subscribe(data => {
      if (!data.profile?.data) {
        this.error = 'فشل تحميل المعلومات الشخصية.';
        return;
      }
      this.driverProfile = data.profile.data;
      if (this.driverProfile.driverImageUrl) {
        this.driverProfile.driverImageUrl = this.toAbsoluteUrl(this.driverProfile.driverImageUrl);
      }
      this.driverCurrentTrips = data.currentTrips?.data || [];
      this.driverTrips = data.historyTrips?.data || [];
      this.driverDocuments = data.documents?.data || [];
      if (data.vehicle?.data) {
        if (data.vehicle.data.imageURLs?.length) {
          data.vehicle.data.imageURLs = data.vehicle.data.imageURLs.map((url: string) => this.toAbsoluteUrl(url));
        }
        this.driverVehicle = data.vehicle.data;
      }
    });
  }

  fetchPassengerData(): void {
    const passengerData$ = forkJoin({
        profile: this.profileService.getPassengerProfile().pipe(catchError(() => of(null))),
        currentTrips: this.profileService.getPassengerCurrentTrips().pipe(catchError(() => of({ data: [] }))),
        historyTrips: this.profileService.getPassengerHistoryTrips().pipe(catchError(() => of({ data: [] })))
    }).pipe(
      finalize(() => this.isLoading = false)
    );

    passengerData$.subscribe(data => {
        if (!data.profile?.data) {
          this.error = 'فشل تحميل الملف الشخصي.';
          return;
        }
        this.passengerProfile = data.profile.data;
        if (this.passengerProfile.profileImageUrl) {
            this.passengerProfile.profileImageUrl = this.toAbsoluteUrl(this.passengerProfile.profileImageUrl);
        }
        this.passengerCurrentTrips = data.currentTrips?.data || [];
        this.passengerTrips = data.historyTrips?.data || [];
    });
  }


  public setView(view: 'personalInfo' | 'currentTrips' | 'pastTrips'): void {
    this.activeView = view;
  }

  openEditDriver(): void {
    this.editMode = true;
    this.editDriverData = {
      driverName: this.driverProfile?.name || '',
      phoneNumber: this.driverProfile?.phoneNumber || '',
      description: this.driverProfile?.description || '',
      profileImage: undefined
    };
  }

  openEditPassenger(): void {
    this.editMode = true;
    this.editPassengerData = {
      Name: this.passengerProfile?.name || '',
      PhoneNumber: this.passengerProfile?.phoneNumber || '',
      ProfileImage: undefined
    };
  }

  onDriverImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.editDriverData.profileImage = input.files[0];
      this.driverProfile.driverImageUrl = URL.createObjectURL(input.files[0]);
    }
  }

  onPassengerImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.editPassengerData.ProfileImage = input.files[0];
      this.passengerProfile.profileImageUrl = URL.createObjectURL(input.files[0]);
    }
  }

  saveDriverProfile(): void {
    this.isSaving = true;
    this.profileService.editDriverProfile(this.editDriverData).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.editMode = false;
        this.fetchDriverData();
        Swal.fire({ icon: 'success', title: 'تم الحفظ بنجاح!', showConfirmButton: false, timer: 1500 });
      },
      error: (err) => {
        console.error('Failed to update driver profile:', err);
        Swal.fire({ icon: 'error', title: 'خطأ!', text: 'فشل تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.' });
      }
    });
  }

  savePassengerProfile(): void {
    this.isSaving = true;
    this.profileService.updatePassengerProfile(this.editPassengerData).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.editMode = false;
        this.fetchPassengerData();
        Swal.fire({ icon: 'success', title: 'تم الحفظ بنجاح!', showConfirmButton: false, timer: 1500 });
      },
      error: (err) => {
        console.error('Failed to update passenger profile:', err);
        Swal.fire({ icon: 'error', title: 'خطأ!', text: 'فشل تحديث الملف الشخصي. يرجى المحاولة مرة أخرى.' });
      }
    });
  }

  cancelEdit(): void {
    this.editMode = false;
 
    if (this.isDriver) {
        if (this.editDriverData.profileImage) this.fetchDriverData();
    } else {
        if (this.editPassengerData.ProfileImage) this.fetchPassengerData();
    }
  }

  openEditVehicle(): void {
    if (!this.driverVehicle || !this.driverProfile) {
      console.error("Vehicle or Driver profile data is missing. Cannot open edit modal.");
      return;
    }
    this.editVehicleMode = true;
    this.editVehicleData = {
      ...this.driverVehicle,
      Id: this.driverVehicle.id,
      DriverId: this.driverProfile.id,
      VehicleImageUrls: [],
      previews: this.driverVehicle.imageURLs ? [...this.driverVehicle.imageURLs] : []
    };
  }

  onVehicleImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.editVehicleData.VehicleImageUrls = Array.from(input.files);
      this.editVehicleData.previews = this.editVehicleData.VehicleImageUrls.map((file: File) => URL.createObjectURL(file));
    }
  }

  saveVehicleDetails(): void {
    this.isSaving = true;
    this.profileService.updateDriverVehicleDetails(this.editVehicleData).pipe(
      finalize(() => this.isSaving = false)
    ).subscribe({
      next: () => {
        this.editVehicleMode = false;
        this.fetchDriverData();
        Swal.fire({ icon: 'success', title: 'تم تحديث بيانات السيارة!', showConfirmButton: false, timer: 1500 });
      },
      error: (err) => {
        console.error('Failed to update vehicle:', err);
        const errorMessage = err.error?.message || 'فشل تحديث بيانات السيارة.';
        Swal.fire({ icon: 'error', title: 'خطأ!', text: errorMessage });
      }
    });
  }

  closeEditVehicle(): void { this.editVehicleMode = false; }
  
  private toAbsoluteUrl(url: string | null): string | null {
    if (!url || url.startsWith('http' ) || url.startsWith('blob:')) return url;
    const domain = API_BASE_URL.split('/api')[0];
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${domain}${path}`;
  }

  clearProfileData(): void {
    this.user = null;
    this.isDriver = false;
    this.driverProfile = null;
    this.passengerProfile = null;
    this.driverVehicle = null;
    this.driverDocuments = [];
    this.driverCurrentTrips = [];
    this.driverTrips = [];
    this.passengerCurrentTrips = [];
    this.passengerTrips = [];
    this.isLoading = true;
    this.error = null;
    this.activeView = 'personalInfo'; // Reset view
  }

  goToTripDetails(tripId: string): void {
    this.router.navigate(['/trip-details', tripId]);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
