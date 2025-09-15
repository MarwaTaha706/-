// In src/app/components/verify-driver/verify-driver.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RegisterDriverService } from '../../services/register-driver.service';
import { AuthService } from '../../services/auth.service';
import {
  faShieldAlt, faCheckCircle, faExclamationTriangle, faIdCard,
  faUserCheck, faCameraRetro, faCar, faClipboardCheck, faEdit,
  faArrowRight, faArrowLeft, faInfoCircle, faTimes, faCarSide
} from '@fortawesome/free-solid-svg-icons';
import { trigger, state, style, transition, animate } from '@angular/animations';

// Custom validator to ensure a file array is not empty
function arrayRequired(control: AbstractControl): { [key: string]: any } | null {
  const value = control.value;
  return Array.isArray(value) && value.length > 0 ? null : { required: true };
}

@Component({
  selector: 'app-verify-driver',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './verify-driver.component.html',
  styleUrls: ['./verify-driver.component.css'],
  animations: [
    trigger('toastState', [
      state('void', style({ transform: 'translateY(150%)', opacity: 0 })),
      state('*', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('void <=> *', animate('400ms ease-in-out'))
    ])
  ]
})
export class VerifyDriverComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private registerDriverService = inject(RegisterDriverService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  icons = {
    main: faShieldAlt, success: faCheckCircle, error: faExclamationTriangle,
    license: faIdCard, carLicense: faCarSide,
    identity: faUserCheck, camera: faCameraRetro, vehicle: faCar,
    review: faClipboardCheck, edit: faEdit, prev: faArrowRight,
    next: faArrowLeft, info: faInfoCircle, close: faTimes
  };

  verificationForm!: FormGroup;
  currentStep = 1;
  totalSteps = 6;
  isSubmitting = false;
  toast: { message: string, type: 'success' | 'error' } | null = null;
  showSuccessPopup = false;

  previews: { [key: string]: SafeUrl[] } = {
    licenseFile: [], carLicenseFile: [], driverIdFile: [], vehicleImages: []
  };

  private selectedFiles: { [key: string]: File[] } = {
    licenseFile: [], carLicenseFile: [], driverIdFile: [], vehicleImages: []
  };

  get f() { return this.verificationForm.controls; }

  ngOnInit(): void {
    this.verificationForm = this.fb.group({
      licenseFile: [[], [arrayRequired]],
      carLicenseFile: [[], [arrayRequired]],
      driverIdFile: [[], [arrayRequired]],
      vehicleImages: [[], [arrayRequired]],
      vehicleMake: ['', [Validators.required]],
      vehicleModel: ['', [Validators.required]],
      vehicleColor: ['', [Validators.required]],
      vehicleSeats: [null, [Validators.required, Validators.min(1)]],
      plateNumber: ['', [Validators.required]],
      description: ['']
    });
  }

  // --- All other methods (nextStep, previousStep, etc.) remain the same ---
  nextStep(): void {
    if (this.isStepValid()) { this.currentStep++; }
    else {
      this.markStepAsTouched();
      this.showToast('يرجى إكمال جميع الحقول المطلوبة في هذه الخطوة.', 'error');
    }
  }

  previousStep(): void { if (this.currentStep > 1) { this.currentStep--; } }

  isStepValid(): boolean {
    switch (this.currentStep) {
      case 1: return this.f['licenseFile'].valid;
      case 2: return this.f['carLicenseFile'].valid;
      case 3: return this.f['driverIdFile'].valid;
      case 4: return this.f['vehicleImages'].valid;
      case 5: return ['vehicleMake', 'vehicleModel', 'vehicleColor', 'vehicleSeats', 'plateNumber'].every(field => this.f[field]?.valid);
      default: return true;
    }
  }

  getStepTitle(): string {
    const titles = ['رخصة القيادة', 'رخصة السيارة', 'هوية السائق', 'صور المركبة', 'بيانات المركبة', 'المراجعة النهائية'];
    return titles[this.currentStep - 1];
  }

  onFileSelected(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFiles[controlName].push(...Array.from(input.files));
      this.updateFormControl(controlName);
      input.value = '';
    }
  }

  removeImage(controlName: string, index: number): void {
    this.selectedFiles[controlName].splice(index, 1);
    this.updateFormControl(controlName);
  }

  private updateFormControl(controlName: string): void {
    const files = this.selectedFiles[controlName];
    this.verificationForm.patchValue({ [controlName]: files });
    this.verificationForm.get(controlName)?.markAsTouched();
    this.verificationForm.get(controlName)?.updateValueAndValidity();
    this.previews[controlName] = files.map(file => this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
  }

  /**
   * *** FINAL AND CORRECTED onSubmit FUNCTION ***
   * This function now makes a SINGLE API call to /api/Account/RegisterDriver
   * with ALL the required data in one FormData object, as the error message dictates.
   */
  onSubmit(): void {
    if (this.verificationForm.invalid) {
      this.verificationForm.markAllAsTouched();
      this.showToast('الرجاء مراجعة البيانات، هناك حقول غير مكتملة.', 'error');
      return;
    }

    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId) {
      this.showToast('لا يمكن تحديد هوية المستخدم. الرجاء تسجيل الدخول مرة أخرى.', 'error');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.verificationForm.value;

    // --- Create ONE FormData object with ALL information ---
    const finalFormData = new FormData();

    // Append Root Level Fields
    finalFormData.append('ApplicationUserId', currentUserId);
    finalFormData.append('DriverDescription', formValue.description || '');

    // Append VehicleDetailsCommand Fields
    finalFormData.append('VehicleDetailsCommand.DriverId', currentUserId);
    finalFormData.append('VehicleDetailsCommand.Model', formValue.vehicleModel);
    finalFormData.append('VehicleDetailsCommand.Color', formValue.vehicleColor);
    finalFormData.append('VehicleDetailsCommand.PlateNumber', formValue.plateNumber);
    finalFormData.append('VehicleDetailsCommand.SeatsNumber', formValue.vehicleSeats.toString());
    finalFormData.append('VehicleDetailsCommand.Description', formValue.description || '');
    (formValue.vehicleImages as File[]).forEach(file => {
      finalFormData.append('VehicleDetailsCommand.VehicleImageUrls', file);
    });

    // *** THIS IS THE CRITICAL FIX ***
    // Append AddVerificationDocuments Fields, as required by the error message.
    finalFormData.append('AddVerificationDocuments.Comment', formValue.description || '');
    (formValue.licenseFile as File[]).forEach(file => {
      finalFormData.append('AddVerificationDocuments.DriverLicense', file);
    });
    (formValue.driverIdFile as File[]).forEach(file => {
      finalFormData.append('AddVerificationDocuments.Identity', file);
    });
    (formValue.carLicenseFile as File[]).forEach(file => {
      finalFormData.append('AddVerificationDocuments.VehicleRegistration', file);
    });

    // --- Make the SINGLE API call ---
    this.registerDriverService.registerDriver(finalFormData)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: (response) => {
          if (response && response.status === 200) {
            this.showSuccessPopup = true; // Final success!
          } else {
            this.showToast(response?.message || 'فشل إرسال الطلب.', 'error');
          }
        },
        error: (err) => {
          const errorMsg = err.error?.errors ? JSON.stringify(err.error.errors) : (err.error?.message || 'حدث خطأ في البيانات المرسلة.');
          this.showToast(errorMsg, 'error');
        }
      });
  }

  // The registerDriverAndVehicle helper function is no longer needed and can be removed.

  // --- Toast and Popup methods remain the same ---
  showToast(message: string, type: 'success' | 'error'): void {
    this.toast = { message, type };
    setTimeout(() => this.hideToast(), 5000);
  }

  hideToast(): void { this.toast = null; }

  closeSuccessPopup(): void {
    this.showSuccessPopup = false;
    this.router.navigate(['/']);
  }

  private markStepAsTouched(): void {
    const stepControls: { [key: number]: string[] } = {
      1: ['licenseFile'], 2: ['carLicenseFile'], 3: ['driverIdFile'], 4: ['vehicleImages'],
      5: ['vehicleMake', 'vehicleModel', 'vehicleColor', 'vehicleSeats', 'plateNumber']
    };
    const controlsToTouch = stepControls[this.currentStep];
    if (controlsToTouch) {
      controlsToTouch.forEach(field => this.f[field]?.markAsTouched());
    }
  }
}
